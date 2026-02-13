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
  const s = normalizeText(v);
  return s ? s.replace(/\s/g, "") : "";
}

export default function AdminPage() {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [poster, setPoster] = useState("");
  const [affUrl, setAffUrl] = useState("");
  const [affLabel, setAffLabel] = useState("");
  const [genres, setGenres] = useState<GenreKey[]>(["other"]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch("/api/videos", { cache: "no-store" });
    const j = await r.json().catch(() => null);
    if (r.ok && j?.ok) {
      setItems(j.items ?? []);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);

    try {
      const r = await fetch("/api/admin/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_PASSWORD}`,
        },
        body: JSON.stringify({
          title: normalizeText(title),
          url: normalizeUrl(url),
          poster: normalizeUrl(poster) || undefined,
          affUrl: normalizeUrl(affUrl) || undefined,
          affLabel: normalizeText(affLabel) || undefined,
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
      setAffLabel("");
      setGenres(["other"]);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin</h1>
        <Link href="/admin/manage" className="px-4 py-2 bg-white text-black rounded">
          管理
        </Link>
      </header>

      <form onSubmit={onAdd} className="space-y-3">
        <input
          className="w-full px-3 py-2 bg-neutral-800 rounded"
          placeholder="タイトル"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          className="w-full px-3 py-2 bg-neutral-800 rounded"
          placeholder="動画URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />

        <input
          className="w-full px-3 py-2 bg-neutral-800 rounded"
          placeholder="ポスターURL"
          value={poster}
          onChange={(e) => setPoster(e.target.value)}
        />

        <input
          className="w-full px-3 py-2 bg-neutral-800 rounded"
          placeholder="アフィURL"
          value={affUrl}
          onChange={(e) => setAffUrl(e.target.value)}
        />

        <input
          className="w-full px-3 py-2 bg-neutral-800 rounded"
          placeholder="アフィ文言"
          value={affLabel}
          onChange={(e) => setAffLabel(e.target.value)}
        />

        <button
          disabled={busy}
          className="w-full py-3 bg-white text-black font-bold rounded"
        >
          追加
        </button>

        {err && <p className="text-red-400">{err}</p>}
      </form>

      <div className="text-sm text-white/60">登録済み: {items.length} 件</div>
    </main>
  );
}
