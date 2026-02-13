// ===== src/app/admin/page.tsx =====
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { GENRE_GROUPS, type GenreKey } from "@/lib/genres";

type VideoItem = {
  id: string;
  title: string;
  url: string;
  poster?: string;
  affUrl?: string;
  affLabel?: string;
  createdAt: number;
  genres?: string[];
};

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function normalizeText(v: any) {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

function normalizeUrl(v: any): string {
  return normalizeText(v).replace(/\s/g, "");
}

function pickPoster(obj: any): string {
  const cands = [
    obj?.poster,
    obj?.posterUrl,
    obj?.thumbnail,
    obj?.image,
    obj?.ogImage,
  ];
  for (const c of cands) {
    const p = normalizeUrl(c);
    if (p) return p;
  }
  return "";
}

export default function AdminPage() {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [poster, setPoster] = useState("");
  const [affUrl, setAffUrl] = useState("");
  const [affLabel, setAffLabel] = useState("商品を見る");
  const [genres, setGenres] = useState<GenreKey[]>(["other"]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const AUTH_TOKEN = "mdoskldmnvopdkmfjsps6hd9hs9hd0d";

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1200);
  }

  async function load() {
    setErr(null);
    const r = await fetch("/api/videos", { cache: "no-store" });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.ok) {
      setErr(j?.error ?? "load failed");
      return;
    }
    setItems(Array.isArray(j.items) ? j.items : []);
  }

  useEffect(() => {
    load();
  }, []);

  function toggleGenre(key: GenreKey) {
    setGenres((prev) => {
      const has = prev.includes(key);
      let next = has ? prev.filter((x) => x !== key) : [...prev, key];
      if (next.length === 0) next = ["other"];
      if (next.length > 1 && next.includes("other")) {
        next = next.filter((x) => x !== "other");
      }
      return uniq(next) as GenreKey[];
    });
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    try {
      const r = await fetch("/api/videos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AUTH_TOKEN}`,
        },
        body: JSON.stringify({
          title: normalizeText(title),
          url: normalizeUrl(url),
          poster: normalizeUrl(poster),
          affUrl: normalizeUrl(affUrl),
          affLabel: normalizeText(affLabel) || "商品を見る",
          genres,
        }),
      });

      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) {
        setErr(j?.error ?? `add failed (${r.status})`);
        return;
      }

      setTitle("");
      setUrl("");
      setPoster("");
      setAffUrl("");
      setAffLabel("商品を見る");
      setGenres(["other"]);

      await load();
      showToast("追加OK");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 space-y-6">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/80 border border-white/10 text-sm">
          {toast}
        </div>
      )}

      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin</h1>
        <div className="flex gap-2">
          <Link href="/admin/manage" className="px-4 py-2 rounded bg-white/10">
            登録済み
          </Link>
          <button
            onClick={load}
            disabled={busy}
            className="px-4 py-2 rounded bg-white text-black font-bold"
          >
            更新
          </button>
        </div>
      </header>

      <section className="rounded-2xl bg-neutral-900 p-4">
        <h2 className="font-bold mb-4">動画追加</h2>

        <form onSubmit={onAdd} className="grid gap-3">
          <input
            className="px-3 py-2 rounded bg-neutral-800"
            placeholder="タイトル"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <input
            className="px-3 py-2 rounded bg-neutral-800"
            placeholder="動画URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />

          <input
            className="px-3 py-2 rounded bg-neutral-800"
            placeholder="ポスターURL（任意）"
            value={poster}
            onChange={(e) => setPoster(e.target.value)}
          />

          {/* ✅ ここが追加されたアフィURL欄 */}
          <input
            className="px-3 py-2 rounded bg-neutral-800"
            placeholder="アフィリエイトURL（PR用）"
            value={affUrl}
            onChange={(e) => setAffUrl(e.target.value)}
          />

          <input
            className="px-3 py-2 rounded bg-neutral-800"
            placeholder="アフィ表示ラベル（例：商品を見る）"
            value={affLabel}
            onChange={(e) => setAffLabel(e.target.value)}
          />

          <div className="flex flex-wrap gap-2">
            {GENRE_GROUPS.flatMap((g) => g.items).map((it) => (
              <button
                key={it.key}
                type="button"
                onClick={() => toggleGenre(it.key as GenreKey)}
                className={`text-xs px-2 py-1 rounded border ${
                  genres.includes(it.key as GenreKey)
                    ? "bg-white text-black"
                    : "border-white/10"
                }`}
              >
                {it.label}
              </button>
            ))}
          </div>

          <button
            disabled={busy}
            className="w-full py-3 rounded bg-white text-black font-bold"
          >
            追加
          </button>

          {err && <p className="text-red-400 text-sm text-center">{err}</p>}
        </form>
      </section>
    </main>
  );
}
