"use client";

import { useEffect, useState } from "react";

type VideoPayload = {
  title: string;
  url: string;
  poster?: string;
  affUrl?: string;
  affLabel?: string;
  genres: string[];
};

export default function AdminPage() {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [poster, setPoster] = useState("");
  const [affUrl, setAffUrl] = useState("");
  const [affLabel, setAffLabel] = useState("");
  const [genres, setGenres] = useState<string>("other");

  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setOk(null);
    setBusy(true);

    try {
      const payload: VideoPayload = {
        title: title.trim(),
        url: url.trim(),
        poster: poster.trim() || undefined,
        affUrl: affUrl.trim() || undefined,
        affLabel: affLabel.trim() || undefined,
        genres: genres
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean),
      };

      if (!payload.title || !payload.url || payload.genres.length === 0) {
        setErr("INVALID_PAYLOAD");
        return;
      }

      const r = await fetch("/api/admin/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // 🔑 ここ重要：Vercelの Environment Variable
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_PASSWORD}`,
        },
        body: JSON.stringify(payload),
      });

      const j = await r.json().catch(() => null);

      if (!r.ok || !j?.ok) {
        setErr(j?.error || `add failed (${r.status})`);
        return;
      }

      setOk("追加OK");
      setTitle("");
      setUrl("");
      setPoster("");
      setAffUrl("");
      setAffLabel("");
      setGenres("other");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-4">Admin</h1>

      <form onSubmit={onAdd} className="space-y-3 max-w-xl">
        <input
          className="w-full px-3 py-2 rounded bg-neutral-800"
          placeholder="タイトル"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <input
          className="w-full px-3 py-2 rounded bg-neutral-800"
          placeholder="動画URL (mp4 / m3u8)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />

        <input
          className="w-full px-3 py-2 rounded bg-neutral-800"
          placeholder="ポスターURL（任意）"
          value={poster}
          onChange={(e) => setPoster(e.target.value)}
        />

        <input
          className="w-full px-3 py-2 rounded bg-neutral-800"
          placeholder="アフィURL（任意）"
          value={affUrl}
          onChange={(e) => setAffUrl(e.target.value)}
        />

        <input
          className="w-full px-3 py-2 rounded bg-neutral-800"
          placeholder="アフィ文言（任意）"
          value={affLabel}
          onChange={(e) => setAffLabel(e.target.value)}
        />

        <input
          className="w-full px-3 py-2 rounded bg-neutral-800"
          placeholder="ジャンル（カンマ区切り）例: other, amateur"
          value={genres}
          onChange={(e) => setGenres(e.target.value)}
        />

        <button
          className="w-full px-4 py-3 rounded bg-white text-black font-bold"
          disabled={busy}
        >
          追加
        </button>

        {err && <p className="text-red-400 text-sm">{err}</p>}
        {ok && <p className="text-green-400 text-sm">{ok}</p>}
      </form>
    </main>
  );
}
