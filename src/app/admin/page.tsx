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
  genre?: string;
};

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function normalizeText(v: any) {
  return String(v ?? "").replace(/\s+/g, " ").trim();
}

function normalizeKey(v: any) {
  return normalizeText(v)
    .toLowerCase()
    .replace(/[“”"']/g, "")
    .replace(/[＿—–]/g, "-")
    .replace(/_/g, "-")
    .replace(/\s+/g, "-")
    .replace(/^#/, "");
}

function sanitizeTitle(raw: string) {
  let s = normalizeText(raw);
  if (!s) return s;
  s = s
    .replace(/\s*[｜|]\s*エロ動画・アダルトビデオ\s*[｜|]\s*FANZA動画\s*$/i, "")
    .replace(/\s*[｜|]\s*エロ動画・アダルトビデオ\s*$/i, "")
    .replace(/\s*[｜|]\s*FANZA動画\s*$/i, "")
    .replace(/\s*[｜|]\s*FANZA\s*$/i, "")
    .replace(/\s*[｜|]\s*DMM(?:\.co\.jp)?\s*$/i, "");
  return normalizeText(s);
}

function normalizeUrl(v: any): string {
  const s = normalizeText(v);
  if (!s) return "";
  return s.replace(/\s/g, "");
}

function pickPoster(obj: any): string {
  const candidates = [
    obj?.poster, obj?.posterUrl, obj?.thumbnail, obj?.thumbnailUrl,
    obj?.thumb, obj?.thumbUrl, obj?.image, obj?.imageUrl,
    obj?.ogImage, obj?.ogImageUrl,
  ];
  for (const c of candidates) {
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
  const [affLabel, setAffLabel] = useState("");
  const [sourcePageUrl, setSourcePageUrl] = useState("");
  const [fanzaJson, setFanzaJson] = useState("");
  const [genres, setGenres] = useState<GenreKey[]>(["other"]);
  const [genreOpen, setGenreOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const AUTH_TOKEN = "mdoskldmnvopdkmfjsps6hd9hs9hd0d";

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1200);
  }

  const genreIndex = useMemo(() => {
    const map = new Map<string, GenreKey>();
    for (const g of GENRE_GROUPS) {
      for (const it of g.items) {
        const k = it.key as GenreKey;
        map.set(normalizeKey(it.key), k);
        map.set(normalizeKey(it.label), k);
      }
    }
    return map;
  }, []);

  const keyToLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of GENRE_GROUPS) {
      for (const it of g.items) { map.set(String(it.key), String(it.label)); }
    }
    return map;
  }, []);

  const normalizedSelected = useMemo(() => {
    const cleaned = (genres ?? []).map((g) => String(g)).filter(Boolean).filter((g) => g !== "ALL");
    return uniq(cleaned) as GenreKey[];
  }, [genres]);

  function toggleGenre(key: GenreKey) {
    setGenres((prev) => {
      const cur = Array.isArray(prev) ? prev : [];
      const exists = cur.includes(key);
      let next = exists ? cur.filter((x) => x !== key) : [...cur, key];
      if (next.length === 0) next = ["other"];
      return uniq(next) as GenreKey[];
    });
  }

  async function load() {
    setErr(null);
    const r = await fetch("/api/videos", { cache: "no-store" });
    const j = await r.json().catch(() => null);
    if (r.ok && j?.items) setItems(j.items);
  }

  useEffect(() => { load(); }, []);

  function applyPasteText(raw: string) {
    const s = normalizeText(raw);
    if (!s) return;
    let obj: any = null;
    try { obj = JSON.parse(s); } catch { return; }
    if (!obj || typeof obj !== "object") return;

    setTitle(sanitizeTitle(obj.title ?? obj.name ?? ""));
    setUrl(normalizeUrl(obj.videoUrl ?? obj.url ?? ""));
    setPoster(pickPoster(obj));
    setAffUrl(normalizeUrl(obj.affUrl ?? obj.pageUrl ?? ""));
    setSourcePageUrl(normalizeUrl(obj.pageUrl ?? ""));
    setAffLabel(normalizeText(obj.affLabel) || "商品を見る");

    const source = obj.genres ?? obj.genre ?? obj.tags ?? [];
    let tokens = Array.isArray(source) ? source.map(x => normalizeText(x)) : String(source).split(/[,\n]/g).map(x => normalizeText(x));
    const matched: GenreKey[] = [];
    for (const tok of tokens) {
      const k = genreIndex.get(normalizeKey(tok));
      if (k) matched.push(k);
    }
    setGenres(matched.length > 0 ? uniq(matched) : ["other"]);
  }

  useEffect(() => {
    const h = window.location.hash || "";
    const m = h.match(/(?:^|[#&])import=([^&]+)/);
    if (m?.[1]) {
      try {
        const json = decodeURIComponent(m[1]);
        setFanzaJson(json);
        applyPasteText(json);
        showToast("取り込みOK");
        window.history.replaceState({}, "", window.location.pathname);
      } catch {}
    }
  }, []);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/api/videos", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${AUTH_TOKEN}`
        },
        body: JSON.stringify({
          title, url, poster, affUrl, affLabel,
          genres: normalizedSelected.length ? normalizedSelected : ["other"]
        }),
      });
      if (r.ok) {
        setTitle(""); setUrl(""); setPoster(""); setAffUrl(""); setAffLabel("");
        setGenres(["other"]); setFanzaJson("");
        showToast("追加OK");
        load();
      } else {
        setErr("追加失敗");
      }
    } finally { setBusy(false); }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 space-y-6">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-white text-black text-sm font-bold shadow-xl">
          {toast}
        </div>
      )}
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Admin</h1>
        <div className="flex items-center gap-2">
          <Link href="/admin/manage" className="px-4 py-2 rounded bg-white/10 text-white font-semibold hover:bg-white/20 transition">登録済み（管理）</Link>
          <button className="px-4 py-2 rounded bg-white text-black font-semibold hover:bg-neutral-200 transition" onClick={() => load()} disabled={busy}>更新</button>
        </div>
      </header>

      <section className="rounded-2xl bg-neutral-900 p-4 space-y-4">
        <h2 className="font-bold mb-3">動画追加</h2>
        
        {/* JSONインポート */}
        <div className="rounded-2xl bg-neutral-800 p-3">
          <textarea
            className="w-full h-24 px-3 py-2 rounded bg-neutral-900 outline-none text-xs text-neutral-400 border border-white/5 focus:border-white/20 transition"
            placeholder="JSON貼り付け（自動で反映されます）"
            value={fanzaJson}
            onChange={(e) => { setFanzaJson(e.target.value); applyPasteText(e.target.value); }}
          />
        </div>

        <form onSubmit={onAdd} className="grid gap-4">
          <div className="space-y-3">
            <input className="w-full px-4 py-3 rounded-xl bg-neutral-800 outline-none border border-transparent focus:border-white/20 transition" placeholder="タイトル" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input className="w-full px-4 py-3 rounded-xl bg-neutral-800 outline-none border border-transparent focus:border-blue-500/50 transition text-blue-400" placeholder="動画URL (.mp4)" value={url} onChange={(e) => setUrl(e.target.value)} />
            
            {/* ★ 復活させたアフィリエイト項目 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input 
                className="sm:col-span-2 w-full px-4 py-3 rounded-xl bg-neutral-800 outline-none border border-transparent focus:border-green-500/50 transition text-green-400" 
                placeholder="アフィリエイトURL" 
                value={affUrl} 
                onChange={(e) => setAffUrl(e.target.value)} 
              />
              <input 
                className="w-full px-4 py-3 rounded-xl bg-neutral-800 outline-none border border-transparent focus:border-white/20 transition text-xs" 
                placeholder="ラベル（商品を見る）" 
                value={affLabel} 
                onChange={(e) => setAffLabel(e.target.value)} 
              />
            </div>
            
            <input className="w-full px-4 py-2 rounded-xl bg-neutral-800 outline-none border border-transparent focus:border-white/10 transition text-xs text-neutral-500" placeholder="ポスター画像URL (任意)" value={poster} onChange={(e) => setPoster(e.target.value)} />
          </div>
          
          {/* ジャンル選択セクション */}
          <div className="rounded-2xl bg-neutral-800 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-neutral-400">選択中のジャンル</span>
              <button type="button" className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition" onClick={() => setGenreOpen(!genreOpen)}>
                {genreOpen ? "閉じる" : "ジャンル一覧を表示"}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {normalizedSelected.map(g => (
                <span key={g} className="text-xs bg-white/20 px-3 py-1.5 rounded-full font-bold border border-white/5">{keyToLabel.get(g) || g}</span>
              ))}
            </div>
            {genreOpen && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto pt-3 border-t border-white/5 custom-scrollbar">
                {GENRE_GROUPS.flatMap(g => g.items).map(it => (
                  <button 
                    key={it.key} 
                    type="button" 
                    onClick={() => toggleGenre(it.key as GenreKey)} 
                    className={`text-[11px] p-2.5 rounded-xl border transition ${normalizedSelected.includes(it.key as GenreKey) ? 'bg-white text-black font-bold' : 'bg-black/20 border-white/5 text-neutral-400 hover:border-white/20'}`}
                  >
                    {it.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="w-full py-4 rounded-2xl bg-white text-black font-black text-lg hover:bg-neutral-200 transition shadow-xl shadow-white/5 disabled:opacity-50" disabled={busy || !url}>
            {busy ? "追加中..." : "データベースに追加する"}
          </button>
          
          {err && <p className="text-red-500 text-sm font-bold text-center bg-red-500/10 py-2 rounded-lg">{err}</p>}
        </form>
      </section>
    </main>
  );
}