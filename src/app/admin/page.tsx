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

function splitWords(s: string) {
  const t = normalizeText(s);
  if (!t) return [];
  return t
    .replace(/[“”"']/g, "")
    .split(/[\s#＃/／｜|・,、:：()（）【】\[\]{}「」<>]+/g)
    .map((x) => normalizeText(x))
    .filter(Boolean);
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
  const fanzaRef = useRef<HTMLTextAreaElement | null>(null);
  const [genres, setGenres] = useState<GenreKey[]>(["other"]);
  const [genreQuery, setGenreQuery] = useState("");
  const [genreOpen, setGenreOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // あなたのパスワード（Bearerトークンとして使用）
  const AUTH_TOKEN = "mdoskldmnvopdkmfjsps6hd9hs9hd0d";

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1200);
  }

  const genreIndex = useMemo(() => {
    const map = new Map<string, GenreKey>();
    const allKeys: GenreKey[] = [];
    const allNorms: Array<{ norm: string; key: GenreKey }> = [];
    for (const g of GENRE_GROUPS) {
      for (const it of g.items) {
        const k = it.key as GenreKey;
        allKeys.push(k);
        const kn = normalizeKey(it.key);
        const ln = normalizeKey(it.label);
        if (kn) { map.set(kn, k); allNorms.push({ norm: kn, key: k }); }
        if (ln) { map.set(ln, k); allNorms.push({ norm: ln, key: k }); }
      }
    }
    allNorms.sort((a, b) => b.norm.length - a.norm.length);
    return { map, allKeys: uniq(allKeys), allNorms };
  }, []);

  const keyToLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of GENRE_GROUPS) {
      for (const it of g.items) { map.set(String(it.key), String(it.label)); }
    }
    return map;
  }, []);

  const jpToKey = useMemo(() => {
    const dict: Array<[GenreKey, string[]]> = [
      ["debut", ["デビュー", "新人", "初av", "初AV", "初出演"]],
      ["solo", ["単体", "ソロ", "1人"]],
      ["amateur", ["素人"]],
      ["exclusive", ["独占配信", "FANZA限定"]],
      ["kiss", ["キス", "接吻"]],
      ["blowjob", ["フェラ"]],
      ["creampie", ["中出し"]],
      ["vertical-video", ["縦動画", "スマホ推奨縦動画"]],
      ["slender", ["スレンダー"]],
      ["cosplay", ["コスプレ"]],
    ];
    return dict;
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
      if (next.length >= 2 && next.includes("other")) next = next.filter((x) => x !== "other");
      return uniq(next) as GenreKey[];
    });
    setGenreQuery("");
  }

  async function load() {
    setErr(null);
    const r = await fetch("/api/videos", { cache: "no-store" });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j?.ok) { setErr(j?.error ?? "load failed"); return; }
    setItems(Array.isArray(j.items) ? j.items : []);
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
      const k = genreIndex.map.get(normalizeKey(tok));
      if (k) matched.push(k);
    }
    const picked = uniq(matched);
    setGenres(picked.length > 0 ? (picked as GenreKey[]) : ["other"]);
  }

  const autoWantedRef = useRef(false);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    let enc = sp.get("fanza") || sp.get("import");
    let fromHash = false;
    if (!enc) {
      const h = window.location.hash || "";
      const m = h.match(/(?:^|[#&])import=([^&]+)/);
      if (m?.[1]) { enc = m[1]; fromHash = true; }
    }
    if (!enc) return;
    autoWantedRef.current = fromHash || sp.get("auto") === "1";
    try {
      const json = decodeURIComponent(enc);
      setFanzaJson(json);
      applyPasteText(json);
      showToast("取り込みOK");
      window.history.replaceState({}, "", window.location.pathname);
    } catch {}
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
          "Authorization": `Bearer ${AUTH_TOKEN}` // ✅ 認証追加
        },
        body: JSON.stringify({
          title, url, poster, affUrl, affLabel,
          genres: normalizedSelected.length ? normalizedSelected : ["other"]
        }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j?.ok) { setErr(j?.error ?? `add failed (${r.status})`); return; }
      setTitle(""); setUrl(""); setPoster(""); setAffUrl(""); setAffLabel("");
      setGenres(["other"]); setFanzaJson("");
      await load();
      showToast("追加OK");
    } finally { setBusy(false); }
  }

  const autoRanRef = useRef(false);
  useEffect(() => {
    if (!autoWantedRef.current || autoRanRef.current) return;
    const t = normalizeText(title), u = normalizeUrl(url);
    if (!t || !u) return;
    autoRanRef.current = true;
    (async () => {
      setBusy(true);
      try {
        const r = await fetch("/api/videos", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${AUTH_TOKEN}` // ✅ 認証追加
          },
          body: JSON.stringify({
            title: t, url: u, poster, affUrl, affLabel,
            genres: normalizedSelected.length ? normalizedSelected : ["other"]
          }),
        });
        if (r.ok) {
          showToast("自動追加OK");
          window.setTimeout(() => { window.location.href = sourcePageUrl || "/"; }, 450);
        } else {
          setErr("Auto add failed");
        }
      } finally { setBusy(false); }
    })();
  }, [title, url]);

  return (
    <main className="min-h-screen bg-black text-white p-6 space-y-6">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/80 border border-white/10 text-sm">
          {toast}
        </div>
      )}
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Admin</h1>
        <div className="flex items-center gap-2">
          <Link href="/admin/manage" className="px-4 py-2 rounded bg-white/10 text-white font-semibold">登録済み（管理）</Link>
          <button className="px-4 py-2 rounded bg-white text-black font-semibold" onClick={() => load()} disabled={busy}>更新</button>
        </div>
      </header>

      <section className="rounded-2xl bg-neutral-900 p-4">
        <h2 className="font-bold mb-3">動画追加</h2>
        <div className="rounded-2xl bg-neutral-800 p-3 mb-3">
          <textarea
            className="w-full h-24 px-3 py-2 rounded bg-neutral-900 outline-none text-xs"
            placeholder="JSON貼り付け"
            value={fanzaJson}
            onChange={(e) => { setFanzaJson(e.target.value); applyPasteText(e.target.value); }}
          />
        </div>

        <form onSubmit={onAdd} className="grid gap-3">
          <input className="w-full px-3 py-2 rounded bg-neutral-800 outline-none" placeholder="タイトル" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="w-full px-3 py-2 rounded bg-neutral-800 outline-none" placeholder="動画URL" value={url} onChange={(e) => setUrl(e.target.value)} />
          
          <div className="rounded-2xl bg-neutral-800 p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold">ジャンル</span>
              <button type="button" className="text-xs bg-white/10 px-2 py-1 rounded" onClick={() => setGenreOpen(!genreOpen)}>表示切替</button>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {normalizedSelected.map(g => (
                <span key={g} className="text-xs bg-white/10 px-2 py-1 rounded">{keyToLabel.get(g) || g}</span>
              ))}
            </div>
            {genreOpen && (
              <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
                {GENRE_GROUPS.flatMap(g => g.items).map(it => (
                  <button key={it.key} type="button" onClick={() => toggleGenre(it.key as GenreKey)} className={`text-xs p-2 rounded border ${normalizedSelected.includes(it.key as GenreKey) ? 'bg-white text-black' : 'border-white/10'}`}>
                    {it.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="w-full py-3 rounded bg-white text-black font-bold" disabled={busy}>追加</button>
          {err && <p className="text-red-400 text-sm text-center">{err}</p>}
        </form>
      </section>
    </main>
  );
}