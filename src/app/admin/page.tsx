// src/app/admin/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  genre?: string;
};

function uniq(arr: string[]) {
  return Array.from(new Set(arr));
}

export default function AdminPage() {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [poster, setPoster] = useState("");
  const [affUrl, setAffUrl] = useState("");
  const [affLabel, setAffLabel] = useState("");

  const [genres, setGenres] = useState<GenreKey[]>(["other"]);
  const [genreQuery, setGenreQuery] = useState("");

  const [genreOpen, setGenreOpen] = useState(false);
  const [genrePin, setGenrePin] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const normalizedSelected = useMemo(() => {
    const cleaned = (genres ?? [])
      .map((g) => String(g))
      .filter(Boolean)
      .filter((g) => g !== "ALL");
    return uniq(cleaned) as GenreKey[];
  }, [genres]);

  function clearGenres() {
    setGenres(["other"]);
  }

  function toggleGenre(key: GenreKey) {
    setGenres((prev) => {
      const cur = Array.isArray(prev) ? prev : [];
      const exists = cur.includes(key);

      let next = exists ? cur.filter((x) => x !== key) : [...cur, key];

      if (next.length === 0) next = ["other"];

      if (next.length >= 2 && next.includes("other")) {
        next = next.filter((x) => x !== "other");
      }

      return uniq(next) as GenreKey[];
    });

    if (!genrePin) setGenreOpen(false);
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

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const payloadGenres = (
        normalizedSelected.length ? normalizedSelected : (["other"] as GenreKey[])
      ).filter((g) => g !== ("ALL" as any));

      const r = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          url,
          poster: poster || undefined,
          affUrl: affUrl || undefined,
          affLabel: affLabel || undefined,
          genres: payloadGenres,
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
      setAffLabel("");
      setGenres(["other"]);
      setGenreQuery("");
      setGenreOpen(false);
      setGenrePin(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  const query = genreQuery.trim().toLowerCase();
  const filteredGroups = useMemo(() => {
    if (!query) return GENRE_GROUPS;

    return GENRE_GROUPS.map((g) => {
      const items = g.items.filter((it) => {
        const t = `${it.key} ${it.label}`.toLowerCase();
        return t.includes(query);
      });
      return { ...g, items };
    }).filter((g) => g.items.length > 0);
  }, [query]);

  return (
    <main className="min-h-screen bg-black text-white p-6 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Admin</h1>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/manage"
            className="px-4 py-2 rounded bg-white/10 text-white font-semibold"
          >
            登録済み（管理）
          </Link>

          <button
            className="px-4 py-2 rounded bg-white text-black font-semibold"
            onClick={() => load()}
            disabled={busy}
          >
            更新
          </button>
        </div>
      </header>

      <section className="rounded-2xl bg-neutral-900 p-4">
        <h2 className="font-bold mb-3">動画追加</h2>

        <form onSubmit={onAdd} className="grid gap-3">
          <input
            className="w-full px-3 py-2 rounded bg-neutral-800 outline-none"
            placeholder="タイトル"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <input
            className="w-full px-3 py-2 rounded bg-neutral-800 outline-none"
            placeholder="動画URL（mp4 / m3u8）"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />

          {/* ✅ ジャンル：開閉式 */}
          <div className="rounded-2xl bg-neutral-800 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold">ジャンル（複数選択）</div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="text-xs rounded-full bg-white/10 text-white px-3 py-1"
                  onClick={clearGenres}
                >
                  リセット
                </button>

                <button
                  type="button"
                  className="text-xs rounded-full bg-white/10 text-white px-3 py-1"
                  onClick={() => setGenreOpen((v) => !v)}
                >
                  {genreOpen ? "閉じる" : "開く"}
                </button>
              </div>
            </div>

            {/* 選択中タグ */}
            <div className="mt-3 flex flex-wrap gap-2">
              {normalizedSelected.map((g) => (
                <span key={g} className="text-xs rounded-full bg-white/10 text-white px-3 py-1">
                  {g}
                </span>
              ))}
            </div>

            {genreOpen ? (
              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <input
                    className="w-full px-3 py-2 rounded bg-neutral-900 outline-none"
                    placeholder="検索（例：オタク / office / 旅行）"
                    value={genreQuery}
                    onChange={(e) => setGenreQuery(e.target.value)}
                  />

                  <label className="ml-3 flex items-center gap-2 text-xs text-white/80 select-none">
                    <input
                      type="checkbox"
                      checked={genrePin}
                      onChange={(e) => setGenrePin(e.target.checked)}
                    />
                    固定（閉じない）
                  </label>
                </div>

                <div className="space-y-4">
                  {filteredGroups.map((g) => (
                    <div key={g.title} className="space-y-2">
                      <div className="text-xs font-semibold text-white/80">{g.title}</div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {g.items.map((it) => {
                          const key = it.key as GenreKey;
                          const selected = normalizedSelected.includes(key);

                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => toggleGenre(key)}
                              className={[
                                "text-left rounded-xl px-3 py-2 text-sm border transition",
                                selected
                                  ? "bg-white text-black border-white"
                                  : "bg-black/20 text-white border-white/10 hover:border-white/30",
                              ].join(" ")}
                            >
                              {it.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {filteredGroups.length === 0 ? (
                    <div className="text-xs text-white/60">該当なし</div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <input
            className="w-full px-3 py-2 rounded bg-neutral-800 outline-none"
            placeholder="ポスターURL（任意）"
            value={poster}
            onChange={(e) => setPoster(e.target.value)}
          />

          <input
            className="w-full px-3 py-2 rounded bg-neutral-800 outline-none"
            placeholder="アフィURL（任意）"
            value={affUrl}
            onChange={(e) => setAffUrl(e.target.value)}
          />

          <input
            className="w-full px-3 py-2 rounded bg-neutral-800 outline-none"
            placeholder="アフィ文言（任意：例「商品を見る」）"
            value={affLabel}
            onChange={(e) => setAffLabel(e.target.value)}
          />

          <button className="w-full px-4 py-3 rounded bg-white text-black font-bold" disabled={busy}>
            追加
          </button>

          {err && <p className="text-red-400 text-sm">{err}</p>}
        </form>
      </section>

      {/* ここでは “登録済み一覧” は見せない（別ページへ） */}
      <section className="rounded-2xl bg-neutral-900 p-4">
        <div className="flex items-center justify-between">
          <div className="font-bold">登録済みは別ページで管理</div>
          <Link href="/admin/manage" className="px-4 py-2 rounded bg-white text-black font-bold">
            管理ページへ
          </Link>
        </div>
        <div className="text-sm text-white/60 mt-2">
          現在: {items.length} 件（更新で反映）
        </div>
      </section>
    </main>
  );
}
