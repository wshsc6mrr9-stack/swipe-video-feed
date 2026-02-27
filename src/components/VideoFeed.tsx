"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VideoCard from "@/components/VideoCard";
import GenreMenu from "@/components/GenreMenu";
import MoreMenu from "@/components/MoreMenu";
import { GENRE_ALL, GENRE_LIKES, GENRE_FAVORITES, type GenreKey } from "@/lib/genres";

// ===== 日本語ジャンル → Redisタグ変換 =====
const GENRE_MAP: Record<string, string[]> = {
  "美少女": ["bishoujo"],
  "巨乳": ["big-breasts"],
  "主観": ["pov"],
  "VR": ["vr", "vr-only", "high-quality-vr"],
  "清楚": ["innocent"],
  "汗だく": ["sweaty"],
  "パイパン": ["shaved"],
};

type VideoItem = {
  id: string;
  title: string;
  url?: string;
  src?: string;
  poster?: string;
  srcType?: "mp4" | "hls";
  affUrl?: string;
  affLabel?: string;
  affiliateUrl?: string;
  affiliateLabel?: string;
  genres?: string[];
  genre?: string;
  likeCount?: number;
};

const EVT_LIKES = "likes_changed_v1";
const KEY_LIKED = "liked_videos_v1";

function readLikedSet(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY_LIKED);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.map(String));
  } catch {}
  return new Set();
}

function isInteractiveTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return !!el.closest(
    [
      "button",
      "a",
      "input",
      "textarea",
      "select",
      "[role='button']",
      "[data-no-swipe='1']",
      "[data-ui='controls']",
    ].join(",")
  );
}

function normalizeText(s: any) {
  return String(s ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

type Props = {
  initialGenre?: GenreKey;
  hideGenreMenu?: boolean;
  startId?: string;
};

export default function VideoFeed({
  initialGenre,
  hideGenreMenu,
  startId,
}: Props = {}) {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [seed, setSeed] = useState(
    typeof window !== "undefined" ? Math.floor(Math.random() * 1_000_000) : 0
  );
  const [hasMore, setHasMore] = useState(true);

  const [vh, setVh] = useState<number>(() =>
    typeof window !== "undefined" ? Math.round(window.innerHeight) : 0
  );

  const [genres, setGenres] = useState<GenreKey[]>(() => {
    if (initialGenre) {
      try {
        return [decodeURIComponent(initialGenre)];
      } catch {
        return [initialGenre];
      }
    }
    return [GENRE_ALL];
  });

  const [query, setQuery] = useState("");

  const trackRef = useRef<HTMLDivElement | null>(null);
  const setTranslate = useCallback((y: number, transition?: string) => {
    const el = trackRef.current;
    if (!el) return;
    el.style.transition = transition ?? "none";
    el.style.transform = `translate3d(0, ${y}px, 0)`;
  }, []);

  const draggingRef = useRef(false);
  const animatingRef = useRef(false);
  const startYRef = useRef(0);
  const dyRef = useRef(0);
  const startTimeRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);
  const appliedStartIdRef = useRef<string>("");

  const indexRef = useRef(index);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    const update = () => {
      if (draggingRef.current) return;
      const vv = window.visualViewport;
      setVh(Math.round(vv?.height ?? window.innerHeight));
    };
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, []);

  const loadMoreVideos = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const params = new URLSearchParams();

      const apiGenres = genres
        .filter(Boolean)
        .flatMap((g) => GENRE_MAP[g] ?? [g]);

      params.set("genres", apiGenres.join(","));
      if (query) params.set("query", query);
      params.set("page", String(page));
      params.set("seed", String(seed));
      params.set("_t", Date.now().toString());

      if (genres.includes(GENRE_FAVORITES)) {
        const likedIds = Array.from(readLikedSet());
        if (!likedIds.length) {
          setItems([]);
          setHasMore(false);
          setLoading(false);
          return;
        }
        params.set("ids", likedIds.join(","));
      }

      const res = await fetch(`/api/feed?${params}`, { cache: "no-store" });
      const json = await res.json().catch(() => []);
      const list = Array.isArray(json) ? json : [];

      if (!list.length) {
        setHasMore(false);
        return;
      }

      setItems((prev) => {
        const ids = new Set(prev.map((v) => v.id));
        return [...prev, ...list.filter((v) => !ids.has(v.id))];
      });

      setPage((p) => p + 1);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, genres, query, page, seed]);

  useEffect(() => {
    if (items.length === 0 && hasMore) loadMoreVideos();
  }, [items.length, hasMore, loadMoreVideos]);

  useEffect(() => {
    if (items.length > 0 && index >= Math.max(0, items.length - 30) && hasMore) {
      loadMoreVideos();
    }
  }, [index, items.length, hasMore, loadMoreVideos]);

  useEffect(() => {
    if (initialGenre) {
      let g = initialGenre;
      try {
        g = decodeURIComponent(initialGenre);
      } catch {}
      setGenres([g]);
      setItems([]);
      setIndex(0);
      setPage(1);
      setSeed(Math.floor(Math.random() * 1_000_000));
      setHasMore(true);
      setTranslate(0, "none");
    }
  }, [initialGenre, setTranslate]);

  useEffect(() => {
    const on = (ev: Event) => {
      const e = ev as CustomEvent<{ videoId: string; count: number }>;
      if (!e?.detail) return;
      setItems((prev) =>
        prev.map((v) =>
          v.id === e.detail.videoId
            ? { ...v, likeCount: Number(e.detail.count) }
            : v
        )
      );
    };
    window.addEventListener(EVT_LIKES, on as any);
    return () => window.removeEventListener(EVT_LIKES, on as any);
  }, []);

  const viewItems = useMemo(() => {
    if (genres.includes(GENRE_ALL)) return items;

    const want = new Set(genres.flatMap((g) => GENRE_MAP[g] ?? [g]));
    return items.filter((v) =>
      (v.genres ?? []).some((t) => want.has(t))
    );
  }, [items, genres]);

  const count = viewItems.length;
  const h = vh || 0;
  const PEEK = 14;
  const cardH = Math.max(0, h - PEEK * 2);

  const windowItems = useMemo(() => {
    const out: any[] = [];
    if (viewItems[index - 1])
      out.push({ item: viewItems[index - 1], pos: -1, absIndex: index - 1 });
    if (viewItems[index])
      out.push({ item: viewItems[index], pos: 0, absIndex: index });
    if (viewItems[index + 1])
      out.push({ item: viewItems[index + 1], pos: 1, absIndex: index + 1 });
    return out;
  }, [viewItems, index]);

  return (
    <div className="relative w-full bg-black overflow-hidden" style={{ height: "100svh" }}>
      {!hideGenreMenu && (
        <div className="absolute z-40" data-no-swipe="1" style={{ top: 12, left: 12 }}>
          <GenreMenu
            value={genres}
            onChange={(v) => {
              setGenres(v);
              setItems([]);
              setIndex(0);
              setPage(1);
              setSeed(Math.floor(Math.random() * 1_000_000));
              setHasMore(true);
              setTranslate(0, "none");
            }}
            query={query}
            onChangeQuery={(s) => {
              setQuery(s);
              setItems([]);
              setIndex(0);
              setPage(1);
              setSeed(Math.floor(Math.random() * 1_000_000));
              setHasMore(true);
              setTranslate(0, "none");
            }}
          />
        </div>
      )}

      <div className="absolute z-40" data-no-swipe="1" style={{ top: 4, right: 12 }}>
        <MoreMenu />
      </div>

      <div ref={trackRef} style={{ position: "relative", height: `${vh}px` }}>
        {windowItems.map(({ item, pos, absIndex }) => (
          <div
            key={`${item.id}:${absIndex}`}
            style={{
              position: "absolute",
              inset: 0,
              top: `${pos * h + PEEK}px`,
              height: `${cardH}px`,
            }}
          >
            <VideoCard video={item} isActive={absIndex === index} />
          </div>
        ))}
      </div>
    </div>
  );
}