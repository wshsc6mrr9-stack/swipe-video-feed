// src/app/admin/page.tsx
"use client";

import React, { useEffect, useState } from "react";

type VideoItem = {
  id: string;
  title: string;
  url: string;
  poster?: string;
  affUrl?: string;
  affLabel?: string;
  createdAt: number;
};

export default function AdminPage() {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [poster, setPoster] = useState("");
  const [affUrl, setAffUrl] = useState("");
  const [affLabel, setAffLabel] = useState("");

  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      const r = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          url,
          poster: poster || undefined,
          affUrl: affUrl || undefined,
          affLabel: affLabel || undefined,
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
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!id) {
      setErr("idが必要");
      return;
    }

    setErr(null);
    setBusy(true);
    try {
      // ✅ bodyじゃなく query で送る（これで “idが必要” が消える）
      const r = await fetch(`/api/videos?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) {
        setErr(j?.error ?? `delete failed (${r.status})`);
        return;
      }

      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin</h1>
        <button
          className="px-4 py-2 rounded bg-white text-black font-semibold"
          onClick={() => load()}
          disabled={busy}
        >
          更新
        </button>
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

          <button
            className="w-full px-4 py-3 rounded bg-white text-black font-bold"
            disabled={busy}
          >
            追加
          </button>

          {err && <p className="text-red-400 text-sm">{err}</p>}
        </form>
      </section>

      <section className="rounded-2xl bg-neutral-900 p-4">
        <h2 className="font-bold mb-3">登録済み（{items.length}）</h2>

        <div className="space-y-3">
          {items.map((v) => (
            <div
              key={v.id}
              className="rounded-2xl bg-neutral-950 border border-neutral-800 p-4 flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="font-bold">{v.title}</div>
                <div className="text-xs text-neutral-300 break-all">{v.url}</div>
                <div className="text-xs text-neutral-500 mt-1 break-all">
                  id: {v.id}
                </div>
                {v.affUrl && (
                  <div className="text-xs text-green-400 mt-1 break-all">
                    AFF: {(v.affLabel ?? "labelなし")} / {v.affUrl}
                  </div>
                )}
              </div>

              <button
                className="shrink-0 px-4 py-2 rounded bg-red-600 font-bold"
                onClick={() => onDelete(v.id)}
                disabled={busy}
              >
                削除
              </button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
