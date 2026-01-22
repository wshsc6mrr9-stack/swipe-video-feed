// src/app/admin/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import type { VideoItem } from "@/lib/types";

export default function AdminPage() {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // form
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [poster, setPoster] = useState("");
  const [affiliateUrl, setAffiliateUrl] = useState("");
  const [affiliateLabel, setAffiliateLabel] = useState("");

  async function load() {
    const r = await fetch("/api/videos", { cache: "no-store" });
    const j = await r.json().catch(() => null);
    if (j?.ok) setItems(j.items ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    try {
      const r = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          url,
          poster: poster.trim() ? poster : undefined,
          affiliateUrl: affiliateUrl.trim() ? affiliateUrl : undefined,
          affiliateLabel: affiliateLabel.trim() ? affiliateLabel : undefined,
        }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) {
        setErr(j?.error ?? `add failed (${r.status})`);
        setLoading(false);
        return;
      }

      setTitle("");
      setUrl("");
      setPoster("");
      setAffiliateUrl("");
      setAffiliateLabel("");

      await load();
    } catch (e: any) {
      setErr(e?.message ?? "network error");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("削除する？")) return;

    setErr(null);
    try {
      const r = await fetch("/api/videos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) {
        setErr(j?.error ?? `delete failed (${r.status})`);
        return;
      }
      await load();
    } catch (e: any) {
      setErr(e?.message ?? "network error");
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin</h1>
        <button
          className="px-4 py-2 rounded bg-white text-black font-bold"
          onClick={() => load()}
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
            value={affiliateUrl}
            onChange={(e) => setAffiliateUrl(e.target.value)}
          />

          <input
            className="w-full px-3 py-2 rounded bg-neutral-800 outline-none"
            placeholder="アフィ文言（任意：例『続きはこちら』）"
            value={affiliateLabel}
            onChange={(e) => setAffiliateLabel(e.target.value)}
          />

          <button
            disabled={loading}
            className="px-4 py-3 rounded bg-white text-black font-bold disabled:opacity-60"
            type="submit"
          >
            {loading ? "..." : "追加"}
          </button>

          {err ? <p className="text-red-400 text-sm">{err}</p> : null}
        </form>
      </section>

      <section className="rounded-2xl bg-neutral-900 p-4">
        <h2 className="font-bold mb-3">登録済み（{items.length}）</h2>

        <div className="space-y-3">
          {items.map((v) => (
            <div
              key={v.id}
              className="rounded-xl bg-neutral-800 p-3 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="font-bold break-words">{v.title}</div>
                <div className="text-xs text-neutral-300 break-words">{v.url}</div>

                {v.affiliateUrl ? (
                  <div className="mt-2 text-xs text-green-300 break-words">
                    AFF: {v.affiliateLabel ?? "（labelなし）"} / {v.affiliateUrl}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-neutral-400">AFF: なし</div>
                )}
              </div>

              <button
                className="shrink-0 px-3 py-2 rounded bg-red-500 text-white font-bold"
                onClick={() => onDelete(v.id)}
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
