// ===== src/app/admin/page.tsx =====
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { GENRE_GROUPS, type GenreKey } from "@/lib/genres";

/* =========================
   🔐 管理用トークン
   ========================= */
const ADMIN_TOKEN =
  process.env.NEXT_PUBLIC_ADMIN_TOKEN || "mdoskldmnvopdkmfjsps6hd9hs9hd0d";

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
  return s
    .replace(/\s*[｜|]\s*エロ動画・アダルトビデオ.*$/i, "")
    .replace(/\s*[｜|]\s*FANZA.*$/i, "")
    .trim();
}

function normalizeUrl(v: any): string {
  const s = normalizeText(v);
  if (!s) return "";
  return s.replace(/\s/g, "");
}

function pickPoster(obj: any): string {
  const keys = [
    "poster",
    "posterUrl",
    "thumbnail",
    "thumbnailUrl",
    "thumb",
    "thumbUrl",
    "image",
    "imageUrl",
    "ogImage",
    "ogImageUrl",
  ];
  for (const k of keys) {
    const p = normalizeUrl(obj?.[k]);
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

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1200);
  }

  const genreIndex = useMemo(() => {
    const map = new Map<string, GenreKey>();
    const allNorms: Array<{ norm: string; key: GenreKey }> = [];

    for (const g of GENRE_GROUPS) {
      for (const it of g.items) {
        const k = it.key as GenreKey;
        const kn = normalizeKey(it.key);
        const ln = normalizeKey(it.label);
        if (kn) {
          map.set(kn, k);
          allNorms.push({ norm: kn, key: k });
        }
        if (ln) {
          map.set(ln, k);
          allNorms.push({ norm: ln, key: k });
        }
      }
    }
    allNorms.sort((a, b) => b.norm.length - a.norm.length);
    return { map, allNorms };
  }, []);

  const keyToLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of GENRE_GROUPS) {
      for (const it of g.items) m.set(String(it.key), String(it.label));
    }
    return m;
  }, []);

  const normalizedSelected = useMemo(
    () => uniq(genres.filter((g) => g !== "ALL")) as GenreKey[],
    [genres]
  );

  function clearGenres() {
    setGenres(["other"]);
  }

  function toggleGenre(key: GenreKey) {
    setGenres((prev) => {
      let next = prev.includes(key)
        ? prev.filter((x) => x !== key)
        : [...prev, key];
      if (next.length === 0) next = ["other"];
      if (next.length > 1) next = next.filter((x) => x !== "other");
      return uniq(next) as GenreKey[];
    });
  }

  async function load() {
    const r = await fetch("/api/videos", { cache: "no-store" });
    const j = await r.json();
    if (r.ok && j?.ok) setItems(j.items || []);
  }

  useEffect(() => {
    load();
  }, []);

  function applyPasteText(raw: string) {
    try {
      const obj = JSON.parse(raw);
      setTitle(sanitizeTitle(obj.title ?? ""));
      setUrl(normalizeUrl(obj.videoUrl ?? obj.url ?? ""));
      setPoster(pickPoster(obj));
      setAffUrl(normalizeUrl(obj.affUrl ?? obj.pageUrl ?? ""));
      setAffLabel(obj.affLabel ?? "商品を見る");
      setSourcePageUrl(normalizeUrl(obj.pageUrl ?? ""));
    } catch {}
  }

  async function postVideo(payload: any) {
    return fetch("/api/videos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ADMIN_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await postVideo({
        title,
        url,
        poster,
        affUrl,
        affLabel,
        genres: normalizedSelected,
      });
      const j = await r.json();
      if (!r.ok || !j?.ok) {
        setErr(j?.error ?? "add failed");
        return;
      }
      showToast("追加OK");
      setTitle("");
      setUrl("");
      setPoster("");
      setAffUrl("");
      setAffLabel("");
      setGenres(["other"]);
      setFanzaJson("");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white p-6 space-y-6">
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-black/80 px-4 py-2 rounded text-sm">
          {toast}
        </div>
      )}

      <h1 className="text-2xl font-bold">Admin</h1>

      <section className="bg-neutral-900 p-4 rounded-2xl">
        <textarea
          ref={fanzaRef}
          className="w-full h-24 bg-neutral-800 p-2 text-xs"
          placeholder="FANZA JSON"
          value={fanzaJson}
          onChange={(e) => {
            setFanzaJson(e.target.value);
            applyPasteText(e.target.value);
          }}
        />

        <form onSubmit={onAdd} className="grid gap-3 mt-3">
          <input className="bg-neutral-800 p-2" placeholder="タイトル" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="bg-neutral-800 p-2" placeholder="動画URL" value={url} onChange={(e) => setUrl(e.target.value)} />
          <input className="bg-neutral-800 p-2" placeholder="ポスターURL" value={poster} onChange={(e) => setPoster(e.target.value)} />
          <input className="bg-neutral-800 p-2" placeholder="アフィURL" value={affUrl} onChange={(e) => setAffUrl(e.target.value)} />
          <input className="bg-neutral-800 p-2" placeholder="アフィ文言" value={affLabel} onChange={(e) => setAffLabel(e.target.value)} />
          <button className="bg-white text-black py-3 rounded font-bold" disabled={busy}>
            追加
          </button>
          {err && <p className="text-red-400 text-sm">{err}</p>}
        </form>
      </section>
    </main>
  );
}
