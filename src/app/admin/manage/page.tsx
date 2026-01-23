// src/app/admin/manage/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type VideoItem = {
  id: string;
  title: string;
  url: string;
  poster?: string;
  affUrl?: string;
  affLabel?: string;
  createdAt: number;

  // 新旧互換
  genres?: string[];
  genre?: string;
};

function fmtDate(ms: number) {
  if (!Number.isFinite(ms)) return "";
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

function getGenres(v: VideoItem): string[] {
  if (Array.isArray(v.genres) && v.genres.length) return v.genres.filter(Boolean);
  if (typeof v.genre === "string" && v.genre.trim()) return [v.genre.trim()];
  return ["other"];
}

export default function AdminManagePage() {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // ✅ 名前検索
  const [q, setQ] = useState("");

  // ✅ 表示件数（増えたら段階表示）
  const [limit, setLimit] = useState(50);

  async function load() {
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/api/videos", { cache: "no-store" });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) {
        setErr(j?.error ?? "load failed");
        return;
      }
      const list = Array.isArray(j.items) ? j.items : [];
      setItems(list);
      setLimit(50);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onDelete(id: string) {
    if (!id) {
      setErr("idが必要");
      return;
    }
    if (!confirm("この動画を削除する？")) return;

    setErr(null);
    setBusy(true);
    try {
      const r = await fetch(`/api/videos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) {
        setErr(j?.error ?? `delete failed (${r.status})`);
        return;
      }
      // 一旦ローカルからも消す（体感速い）
      setItems((prev) => prev.filter((v) => v.id !== id));
    } finally {
      setBusy(false);
    }
  }

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;

    return items.filter((v) => {
      const title = String(v.title ?? "").toLowerCase();
      const id = String(v.id ?? "").toLowerCase();
      const url = String(v.url ?? "").toLowerCase();
      return title.includes(query) || id.includes(query) || url.includes(query);
    });
  }, [items, q]);

  const shown = useMemo(() => filtered.slice(0, limit), [filtered, limit]);

  return (
    <main className="min-h-screen bg-black text-white p-6 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="px-4 py-2 rounded bg-white/10 text-white font-semibold"
          >
            ← 追加へ
          </Link>
          <h1 className="text-2xl font-bold">登録済み 管理</h1>
        </div>

        <button
          className="px-4 py-2 rounded bg-white text-black font-semibold"
          onClick={load}
          disabled={busy}
        >
          更新
        </button>
      </header>

      <section className="rounded-2xl bg-neutral-900 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="font-bold">
            検索（タイトル / ID / URL）
            <span className="text-white/60 text-sm ml-2">
              {filtered.length}件 / 全{items.length}件
            </span>
          </div>

          <div className="text-xs text-white/60">
            表示：{Math.min(limit, filtered.length)} / {filtered.length}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            className="w-full px-3 py-2 rounded bg-neutral-800 outline-none"
            placeholder="例：オタク / v_ / mp4 など"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button
            className="px-4 py-2 rounded bg-white/10 text-white font-semibold"
            type="button"
            onClick={() => setQ("")}
          >
            クリア
          </button>
        </div>

        {err && <p className="text-red-400 text-sm">{err}</p>}
      </section>

      <section className="rounded-2xl bg-neutral-900 p-4">
        <div className="space-y-3">
          {shown.map((v) => (
            <div
              key={v.id}
              className="rounded-2xl bg-neutral-950 border border-neutral-800 p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
            >
              <div className="min-w-0 space-y-1">
                <div className="font-bold break-words">{v.title}</div>

                <div className="text-xs text-neutral-300 break-all">{v.url}</div>

                <div className="text-xs text-neutral-400 break-all">
                  genres: <span className="text-white/80">{getGenres(v).join(", ")}</span>
                </div>

                <div className="text-xs text-neutral-500 break-all">
                  id: {v.id} / {fmtDate(v.createdAt)}
                </div>

                {v.affUrl && (
                  <div className="text-xs text-green-400 break-all">
                    AFF: {(v.affLabel ?? "labelなし")} / {v.affUrl}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-2 rounded bg-white/10 text-white text-xs font-semibold"
                  >
                    動画を開く
                  </a>

                  {v.affUrl ? (
                    <a
                      href={v.affUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 rounded bg-white/10 text-white text-xs font-semibold"
                    >
                      アフィを開く
                    </a>
                  ) : null}

                  <button
                    type="button"
                    className="px-3 py-2 rounded bg-white/10 text-white text-xs font-semibold"
                    onClick={() => navigator.clipboard.writeText(v.id)}
                  >
                    IDコピー
                  </button>

                  <button
                    type="button"
                    className="px-3 py-2 rounded bg-white/10 text-white text-xs font-semibold"
                    onClick={() => navigator.clipboard.writeText(v.url)}
                  >
                    URLコピー
                  </button>
                </div>
              </div>

              <div className="shrink-0 flex items-center gap-2">
                <button
                  className="px-4 py-2 rounded bg-red-600 font-bold"
                  onClick={() => onDelete(v.id)}
                  disabled={busy}
                >
                  削除
                </button>
              </div>
            </div>
          ))}

          {filtered.length === 0 ? (
            <div className="text-sm text-white/70">該当なし</div>
          ) : null}

          {filtered.length > shown.length ? (
            <div className="pt-4 flex justify-center">
              <button
                className="px-5 py-3 rounded bg-white text-black font-bold"
                onClick={() => setLimit((n) => n + 50)}
                disabled={busy}
              >
                さらに表示（+50）
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
