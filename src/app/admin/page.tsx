// src/app/admin/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { VideoItem } from "@/lib/types";

export default function AdminPage() {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [poster, setPoster] = useState("");
  const [affUrl, setAffUrl] = useState("");
  const [affLabel, setAffLabel] = useState("");

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/videos", { cache: "no-store" });
      const json: any = await res.json().catch(() => null);
      const list: VideoItem[] = Array.isArray(json?.items) ? json.items : [];
      setItems(list);
    } catch (e: any) {
      setErr(e?.message ?? "load error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const canSubmit = useMemo(() => title.trim() && url.trim(), [title, url]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);

    const body = {
      title: title.trim(),
      url: url.trim(),
      poster: poster.trim() || undefined,
      affUrl: affUrl.trim() || undefined,
      affLabel: affLabel.trim() || undefined,
    };

    try {
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json: any = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? `add failed (${res.status})`);
      }

      setTitle("");
      setUrl("");
      setPoster("");
      setAffUrl("");
      setAffLabel("");

      setMsg("追加OK");
      await reload();

      // ✅ フィードに即反映させたい時（同一タブでも効く）
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const bc = new BroadcastChannel("videos");
        bc.postMessage({ type: "videos:updated" });
        bc.close();
      }
    } catch (e: any) {
      setErr(e?.message ?? "network error");
    }
  }

  async function onDelete(id: string) {
    if (!confirm("削除する？")) return;
    setMsg(null);
    setErr(null);

    try {
      const res = await fetch("/api/videos", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json: any = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error ?? `delete failed (${res.status})`);
      }

      setMsg("削除OK");
      await reload();

      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        const bc = new BroadcastChannel("videos");
        bc.postMessage({ type: "videos:updated" });
        bc.close();
      }
    } catch (e: any) {
      setErr(e?.message ?? "network error");
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold">Admin</h1>

      <div className="mt-3 text-white/70 text-sm">
        ここで追加 → フィード（/）に反映される
      </div>

      <form onSubmit={onAdd} className="mt-6 max-w-xl space-y-3">
        <input
          className="w-full rounded bg-neutral-900 px-3 py-2 outline-none"
          placeholder="タイトル（必須）"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="w-full rounded bg-neutral-900 px-3 py-2 outline-none"
          placeholder="動画URL（必須）例: https://media.atok-online.com/1.mp4"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <input
          className="w-full rounded bg-neutral-900 px-3 py-2 outline-none"
          placeholder="poster URL（任意）"
          value={poster}
          onChange={(e) => setPoster(e.target.value)}
        />
        <input
          className="w-full rounded bg-neutral-900 px-3 py-2 outline-none"
          placeholder="アフィURL（任意）"
          value={affUrl}
          onChange={(e) => setAffUrl(e.target.value)}
        />
        <input
          className="w-full rounded bg-neutral-900 px-3 py-2 outline-none"
          placeholder="アフィ表示名（任意）例: 商品を見る"
          value={affLabel}
          onChange={(e) => setAffLabel(e.target.value)}
        />

        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded bg-white text-black px-4 py-2 font-bold disabled:opacity-40"
        >
          追加
        </button>

        {msg && <div className="text-emerald-300 text-sm">{msg}</div>}
        {err && <div className="text-red-300 text-sm">{err}</div>}
      </form>

      <h2 className="mt-10 text-lg font-bold">登録済み</h2>

      {loading ? (
        <div className="mt-3 text-white/70">読み込み中…</div>
      ) : items.length === 0 ? (
        <div className="mt-3 text-white/70">まだ0件</div>
      ) : (
        <div className="mt-3 space-y-3 max-w-3xl">
          {items.map((v) => (
            <div
              key={v.id}
              className="rounded-xl bg-white/5 p-4 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="font-semibold line-clamp-1">{v.title}</div>
                <div className="text-xs text-white/60 break-all mt-1">{v.url}</div>
                {(v.affUrl || v.affLabel) && (
                  <div className="text-xs text-white/60 break-all mt-1">
                    aff: {v.affLabel ?? "(labelなし)"} / {v.affUrl ?? "(urlなし)"}
                  </div>
                )}
              </div>

              <button
                className="shrink-0 rounded bg-red-500 text-white px-3 py-2 text-sm font-bold"
                onClick={() => onDelete(v.id)}
              >
                削除
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
