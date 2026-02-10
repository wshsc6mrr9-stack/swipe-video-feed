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
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(50);

  // ✅ 複数選択用のState
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
      setSelectedIds([]); // リロード時に選択解除
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ✅ 単一削除
  async function onDelete(id: string) {
    if (!confirm("この動画を削除する？")) return;
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch(`/api/videos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Delete failed");
      setItems((prev) => prev.filter((v) => v.id !== id));
      setSelectedIds((prev) => prev.filter(sid => sid !== id));
    } catch (e) {
      setErr("削除に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  // ✅ 一括削除
  async function onBulkDelete() {
    const count = selectedIds.length;
    if (count === 0) return;
    if (!confirm(`選択した ${count} 件をすべて削除してもよろしいですか？`)) return;

    setErr(null);
    setBusy(true);
    try {
      for (const id of selectedIds) {
        await fetch(`/api/videos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      }
      setItems((prev) => prev.filter((v) => !selectedIds.includes(v.id)));
      setSelectedIds([]);
      alert(`${count} 件削除しました`);
    } catch (e) {
      setErr("一部の削除に失敗しました。再読み込みしてください。");
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

  // ✅ 全選択ロジック
  const isAllSelected = shown.length > 0 && shown.every(v => selectedIds.includes(v.id));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(prev => prev.filter(id => !shown.some(sv => sv.id === id)));
    } else {
      const newIds = shown.map(v => v.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...newIds])));
    }
  };

  return (
    <main className="min-h-screen bg-black text-white p-6 space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="px-4 py-2 rounded bg-white/10 text-white font-semibold hover:bg-white/20 transition">
            ← 追加へ
          </Link>
          <h1 className="text-2xl font-bold">登録済み 管理</h1>
        </div>
        <button className="px-4 py-2 rounded bg-white text-black font-semibold hover:bg-neutral-200 transition" onClick={load} disabled={busy}>
          更新
        </button>
      </header>

      <section className="rounded-2xl bg-neutral-900 p-4 space-y-4 border border-white/5">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="font-bold flex items-center gap-2">
            検索
            <span className="text-white/60 text-sm font-normal">
              {filtered.length}件 / 全{items.length}件
            </span>
          </div>
          <div className="text-xs text-white/40">
            表示中：{shown.length}件
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={toggleSelectAll}
            className={`px-4 py-2 rounded font-semibold border transition ${isAllSelected ? 'bg-blue-600 border-blue-500' : 'bg-white/5 border-white/10 hover:border-white/30'}`}
          >
            {isAllSelected ? "全選択解除" : "表示分を全選択"}
          </button>
          
          <input
            className="flex-1 px-4 py-2 rounded bg-neutral-800 border border-transparent focus:border-blue-500 outline-none transition"
            placeholder="タイトル、ID、URLで絞り込み..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          {selectedIds.length > 0 ? (
            <button
              className="px-6 py-2 rounded bg-red-600 text-white font-bold hover:bg-red-700 transition animate-pulse"
              onClick={onBulkDelete}
              disabled={busy}
            >
              {selectedIds.length}件を一括削除
            </button>
          ) : (
            <button className="px-4 py-2 rounded bg-white/10 text-white font-semibold hover:bg-white/20 transition" onClick={() => setQ("")}>
              クリア
            </button>
          )}
        </div>
        {err && <p className="text-red-400 text-sm bg-red-400/10 p-2 rounded">{err}</p>}
      </section>

      <section className="rounded-2xl bg-neutral-900 p-4 border border-white/5">
        <div className="space-y-3">
          {shown.map((v) => {
            const isSelected = selectedIds.includes(v.id);
            return (
              <div
                key={v.id}
                className={`rounded-2xl p-4 flex flex-col sm:flex-row sm:items-start gap-4 transition border ${
                  isSelected ? 'bg-blue-600/10 border-blue-500/50' : 'bg-neutral-950 border-neutral-800'
                }`}
              >
                <div className="pt-1">
                  <input
                    type="checkbox"
                    className="w-6 h-6 cursor-pointer accent-blue-500"
                    checked={isSelected}
                    onChange={() => {
                      setSelectedIds(prev => 
                        prev.includes(v.id) ? prev.filter(id => id !== v.id) : [...prev, v.id]
                      );
                    }}
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="font-bold break-words text-lg">{v.title}</div>
                  <div className="text-xs text-blue-400 break-all hover:underline"><a href={v.url} target="_blank" rel="noreferrer">{v.url}</a></div>
                  <div className="text-xs text-neutral-400 italic">ID: {v.id} / {fmtDate(v.createdAt)}</div>
                  <div className="text-xs text-neutral-500">Genres: <span className="text-neutral-300">{getGenres(v).join(", ")}</span></div>
                  
                  <div className="flex flex-wrap gap-2 pt-3">
                    <button className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-white text-xs" onClick={() => navigator.clipboard.writeText(v.id)}>IDコピー</button>
                    <button className="px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 text-white text-xs" onClick={() => navigator.clipboard.writeText(v.url)}>URLコピー</button>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    className="px-4 py-2 rounded bg-red-600/20 text-red-500 hover:bg-red-600 hover:text-white font-bold transition border border-red-500/50"
                    onClick={() => onDelete(v.id)}
                    disabled={busy}
                  >
                    削除
                  </button>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && <div className="text-center py-10 text-white/40">該当する動画が見つかりませんでした</div>}

          {filtered.length > shown.length && (
            <div className="pt-6 flex justify-center">
              <button className="px-8 py-3 rounded-full bg-white text-black font-bold hover:bg-neutral-200 transition shadow-lg" onClick={() => setLimit((n) => n + 50)} disabled={busy}>
                さらに50件表示（残り {filtered.length - shown.length}件）
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}