"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VideoCard from "@/components/VideoCard";
import GenreMenu from "@/components/GenreMenu";
import MoreMenu from "@/components/MoreMenu";
import { GENRE_ALL, GENRE_LIKES, GENRE_FAVORITES, type GenreKey } from "@/lib/genres";
import { GENRE_MAP } from "@/lib/genreMap";

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
  duration?: number;
  pageUrl?: string;
};

const EVT_LIKES = "likes_changed_v1";
const KEY_LIKED = "liked_videos_v1";
const FEED_CACHE_PREFIX = "video_feed_cache_v4"; // v4: hasMore をキャッシュしない設計に変更
const LAST_FEED_KEY = "video_feed_last_v1";
const NORMAL_COUNT = 20;
const INITIAL_COUNT = NORMAL_COUNT;
const PAGES_PER_LOAD = 3;   // 起動時・ループ折り返し時に並列fetchするページ数
const PRELOAD_AHEAD = NORMAL_COUNT * PAGES_PER_LOAD; // 60件: 残りこれを下回ったら先読み
const INITIAL_LOADING_DELAY_MS = 100;
const SCROLL_SETTLE_MS = 90;

function readLikedSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(KEY_LIKED);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) return new Set(arr.map(String));
  } catch {}
  return new Set();
}

function normalizeText(s: any) {
  return String(s ?? "").normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeGenreKey(value: string) {
  try { return decodeURIComponent(value); } catch { return value; }
}

function buildFeedCacheKey(genres: string[], query: string) {
  const g = [...genres].map(normalizeGenreKey).sort().join("|");
  const q = normalizeText(query);
  return `${FEED_CACHE_PREFIX}:${g}::${q}`;
}

function saveLastFeed(items: any[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(LAST_FEED_KEY, JSON.stringify(items.slice(0, 3))); } catch {}
}
function readLastFeed(): any[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LAST_FEED_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

type Props = {
  initialGenre?: GenreKey;
  hideGenreMenu?: boolean;
  startId?: string;
  initialVideos?: any[];   
  initialSeed?: number;    
};

export default function VideoFeed({
  initialGenre,
  hideGenreMenu,
  startId,
  initialVideos,
  initialSeed,
}: Props = {}) {
  const isTopFeed = !initialGenre;

  const [items, setItems] = useState<VideoItem[]>(() => {
    if (!isTopFeed) return [];
    return readLastFeed();
  });
  const hasInstantCache = items.length > 0;
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showInitialLoading, setShowInitialLoading] = useState(false);
  const loadingRef = useRef(false);

  const pageRef = useRef(1);
  const seedRef = useRef(initialSeed ?? (typeof window !== "undefined" ? Math.floor(Math.random() * 1000000) : 0));
  
  const [hasMore, setHasMore] = useState(true);

  const [genres, setGenres] = useState<GenreKey[]>(() => {
    if (initialGenre) {
      try { return [decodeURIComponent(initialGenre)]; } catch { return [initialGenre]; }
    }
    return [GENRE_ALL];
  });

  const [query, setQuery] = useState("");
  const [hasWarmCache, setHasWarmCache] = useState(() => hasInstantCache);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const startIdAppliedRef = useRef(false);
  const indexRef = useRef(index);
  const hydratedCacheKeyRef = useRef<string>("");
  const currentCacheKeyRef = useRef<string>("");
  const settleTimerRef = useRef<number | null>(null);
  const existingIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => { indexRef.current = index; }, [index]);
  useEffect(() => { existingIdsRef.current = new Set(items.map((v) => v.id)); }, [items]);

  const cacheKey = useMemo(() => {
    return buildFeedCacheKey(genres.map(String), query);
  }, [genres, query]);

  useEffect(() => { currentCacheKeyRef.current = cacheKey; }, [cacheKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hydratedCacheKeyRef.current === cacheKey) return;

    hydratedCacheKeyRef.current = cacheKey;
    if (!hasInstantCache) setHasWarmCache(false);

    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      const cachedItems = Array.isArray(parsed?.items) ? parsed.items : [];
      const cachedPage = Number(parsed?.page ?? 1);
      const cachedSeed = Number(parsed?.seed ?? seedRef.current);

      if (cachedItems.length === 0) return;

      setItems(cachedItems.filter((v: any) => v && typeof v.id === "string"));
      pageRef.current = Math.max(1, cachedPage);
      seedRef.current = Number.isFinite(cachedSeed) ? cachedSeed : seedRef.current;
      // hasMore はキャッシュから復元しない（常に true でスタート）
      // 旧キャッシュに hasMore:false が残っていてもフリーズしないようにする
      setHasMore(true);
      setHasWarmCache(true);
    } catch {}
  }, [cacheKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (items.length === 0) return;
      sessionStorage.setItem(cacheKey, JSON.stringify({
        items,
        page: pageRef.current,
        seed: seedRef.current,
        // hasMore はキャッシュしない（false が保存されると永久フリーズするため）
        savedAt: Date.now()
      }));
    } catch {}
  }, [cacheKey, items, hasMore]);

  useEffect(() => {
    if (!(items.length === 0 && loading && !hasWarmCache)) {
      setShowInitialLoading(false);
      return;
    }
    const timer = window.setTimeout(() => setShowInitialLoading(true), INITIAL_LOADING_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [items.length, loading, hasWarmCache]);

  const loadMoreVideos = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const activeGenres = genres.filter(Boolean);
      const isFavMode = activeGenres.includes(GENRE_FAVORITES);
      const canLoop = !isFavMode && !query;

      // ---- ページ1件を取得するヘルパー ----
      const fetchOnePage = async (page: number, seedNum: number): Promise<any[]> => {
        const p = new URLSearchParams();
        const apiGenres = activeGenres.flatMap((g) => {
          if (g === GENRE_FAVORITES || g === GENRE_LIKES) return [g];
          return GENRE_MAP[g] || [];
        });
        if (apiGenres.length > 0) p.set("genres", apiGenres.join(","));
        p.set("page", String(page));
        p.set("seed", String(seedNum));
        p.set("count", String(NORMAL_COUNT));
        if (query) p.set("query", query);
        try {
          const res = await fetch(`/api/feed?${p.toString()}`, { cache: "no-store" });
          if (!res.ok) return [];
          const json = await res.json();
          return Array.isArray(json) ? json : json?.items ?? [];
        } catch {
          return [];
        }
      };

      // ---- PAGES_PER_LOAD ページを並列取得するヘルパー ----
      const fetchParallel = async (startPage: number, seedNum: number): Promise<any[]> => {
        const results = await Promise.all(
          Array.from({ length: PAGES_PER_LOAD }, (_, i) =>
            fetchOnePage(startPage + i, seedNum)
          )
        );
        return results.flat();
      };

      // ---- normalize helper ----
      const normalizeList = (raw: any[]): VideoItem[] =>
        raw
          .map((v) => ({
            id: String(v.id ?? ""),
            title: String(v.title ?? ""),
            url: v.url ?? v.src,
            src: v.src ?? v.url,
            poster: v.poster,
            srcType: v.srcType,
            affUrl: v.affUrl ?? v.affiliateUrl,
            affLabel: v.affLabel ?? v.affiliateLabel,
            affiliateUrl: v.affiliateUrl ?? v.affUrl,
            affiliateLabel: v.affiliateLabel ?? v.affLabel,
            genres: Array.isArray(v.genres) ? v.genres : undefined,
            genre: typeof v.genre === "string" ? v.genre : undefined,
            likeCount: Number(v.likeCount ?? 0),
            duration: Number(v.duration ?? 0) || undefined,
            pageUrl: typeof v.pageUrl === "string" ? v.pageUrl : undefined,
          }))
          .filter((v) => !!v.id);

      // ---- お気に入りモード ----
      if (isFavMode) {
        const likedSet = readLikedSet();
        if (likedSet.size === 0) {
          setItems([]);
          setHasMore(false);
          loadingRef.current = false;
          setLoading(false);
          return;
        }
        const p = new URLSearchParams();
        p.set("ids", Array.from(likedSet).join(","));
        p.set("count", String(NORMAL_COUNT));
        if (query) p.set("query", query);
        const res = await fetch(`/api/feed?${p.toString()}`, { cache: "no-store" });
        if (!res.ok) { loadingRef.current = false; setLoading(false); return; }
        const json = await res.json();
        const list = Array.isArray(json) ? json : json?.items ?? [];
        if (list.length === 0) { setHasMore(false); loadingRef.current = false; setLoading(false); return; }
        const normalized = normalizeList(list);
        const currentIds = existingIdsRef.current;
        const toAdd = normalized.filter((n) => !currentIds.has(n.id));
        if (toAdd.length > 0) setItems((prev) => [...prev, ...toAdd]);
        else setHasMore(false);
        loadingRef.current = false;
        setLoading(false);
        return;
      }

      // ---- 通常 / ジャンル / 検索モード ----
      // 初回・追加読込ともに PAGES_PER_LOAD ページを並列取得（常に60件バッファ）
      let list = await fetchParallel(pageRef.current, seedRef.current);

      if (list.length === 0) {
        if (canLoop) {
          // ループ折り返し: 新しいseedで最初から並列取得
          seedRef.current = Math.floor(Math.random() * 1000000);
          list = await fetchParallel(1, seedRef.current);
          if (list.length === 0) {
            // 2回連続で空 → 一時的なエラーの可能性があるので、hasMoreはfalseにしない
            loadingRef.current = false;
            setLoading(false);
            return;
          }
          pageRef.current = 1 + PAGES_PER_LOAD;
        } else {
          setHasMore(false);
          loadingRef.current = false;
          setLoading(false);
          return;
        }
      } else {
        pageRef.current += PAGES_PER_LOAD;
      }

      const normalized = normalizeList(list);

      if (canLoop) {
        setItems((prev) => [...prev, ...normalized]);
        try { localStorage.removeItem(LAST_FEED_KEY); } catch {}
      } else {
        const currentIds = existingIdsRef.current;
        const toAdd = normalized.filter((n) => !currentIds.has(n.id));
        if (toAdd.length > 0) {
          setItems((prev) => [...prev, ...toAdd]);
        } else {
          setHasMore(false);
        }
      }

      // 最初のロード時だけ lastFeed を保存（pageRef は PAGES_PER_LOAD + 1 まで）
      if (isTopFeed && !query && pageRef.current <= 1 + PAGES_PER_LOAD + 1) {
        saveLastFeed(normalized);
      }

    } catch (e) {
      console.error("Network Error - 裏で再試行します", e);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [genres, hasMore, query, isTopFeed]);

  const viewItems = useMemo(() => {
    if (genres.includes(GENRE_FAVORITES)) {
      const likedSet = readLikedSet();
      return items.filter((v) => likedSet.has(v.id));
    }
    
    if (genres.length === 1 && genres[0] === GENRE_LIKES) {
      return items.slice().sort((a, b) => Number(b.likeCount ?? 0) - Number(a.likeCount ?? 0));
    }

    return items;
  }, [items, genres]);

  useEffect(() => {
    if (loading || !hasMore) return;

    if (items.length === 0) {
      loadMoreVideos();
      return;
    }

    const remainingViews = viewItems.length - index;
    if (remainingViews <= PRELOAD_AHEAD) {
      loadMoreVideos();
    }
  }, [hasMore, index, items.length, loadMoreVideos, viewItems.length, loading]);

  useEffect(() => {
    if (!hasMore) return;
    const id = window.setInterval(() => {
      if (loadingRef.current || !hasMore) return;
      const remaining = viewItems.length - indexRef.current;
      if (remaining <= PRELOAD_AHEAD || viewItems.length === 0) {
        loadMoreVideos();
      }
    }, 200);
    return () => window.clearInterval(id);
  }, [hasMore, loadMoreVideos, viewItems.length]);

  useEffect(() => {
    if (!initialGenre) return;
    let g = initialGenre;
    try { g = decodeURIComponent(initialGenre); } catch {}
    setGenres([g]);
    setItems([]);
    setIndex(0);
    
    pageRef.current = 1;
    seedRef.current = Math.floor(Math.random() * 1000000);
    
    setHasMore(true);
    setHasWarmCache(false);
    startIdAppliedRef.current = false;
    hydratedCacheKeyRef.current = "";

    const el = containerRef.current;
    if (el) el.scrollTo({ top: 0, behavior: "auto" });
  }, [initialGenre]);

  useEffect(() => {
    const on = (ev: Event) => {
      const e = ev as CustomEvent<{ videoId: string; count: number }>;
      if (!e?.detail) return;
      setItems((prev) =>
        prev.map((v) => v.id === e.detail.videoId ? { ...v, likeCount: Number(e.detail.count) } : v)
      );
    };
    window.addEventListener(EVT_LIKES, on as any);
    return () => window.removeEventListener(EVT_LIKES, on as any);
  }, []);

  useEffect(() => {
    if (!startId || startIdAppliedRef.current || viewItems.length === 0) return;
    const found = viewItems.findIndex((v) => v.id === startId);
    if (found < 0) return;

    const el = containerRef.current;
    if (!el) return;

    startIdAppliedRef.current = true;
    setIndex(found);

    requestAnimationFrame(() => {
      const pageHeight = el.clientHeight || window.innerHeight || 1;
      el.scrollTo({ top: found * pageHeight, behavior: "auto" });
    });
  }, [startId, viewItems]);

  const handleResetFeed = useCallback((nextGenres?: GenreKey[], nextQuery?: string) => {
    const resolvedGenres = nextGenres ?? [GENRE_ALL];
    setGenres(resolvedGenres);
    if (typeof nextQuery === "string") setQuery(nextQuery);
    setItems([]);
    setIndex(0);
    
    pageRef.current = 1;
    seedRef.current = Math.floor(Math.random() * 1000000);
    
    setHasMore(true);
    setHasWarmCache(false);
    startIdAppliedRef.current = false;
    hydratedCacheKeyRef.current = "";

    const el = containerRef.current;
    if (el) el.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const resolveNearestIndex = () => {
      const pageHeight = el.clientHeight || window.innerHeight || 1;
      const raw = el.scrollTop / pageHeight;
      const nearest = Math.round(raw);
      const clamped = Math.max(0, Math.min(nearest, Math.max(0, viewItems.length - 1)));
      if (indexRef.current !== clamped) setIndex(clamped);
    };

    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        resolveNearestIndex();
        ticking = false;
      });
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = window.setTimeout(() => {
        resolveNearestIndex();
      }, SCROLL_SETTLE_MS);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (settleTimerRef.current) window.clearTimeout(settleTimerRef.current);
    };
  }, [viewItems.length]);

  const SAFE_PAD = 12;
  const safeTop = `calc(env(safe-area-inset-top) + ${SAFE_PAD}px)`;
  const safeLeft = `calc(env(safe-area-inset-left) + ${SAFE_PAD}px)`;
  const safeRight = `calc(env(safe-area-inset-right) + ${SAFE_PAD}px)`;

  const isInitialLoading = items.length === 0 && loading && !hasWarmCache && showInitialLoading;
  const isNoResults = !loading && !hasMore && items.length > 0 && viewItems.length === 0;

  return (
    <div className="relative w-full bg-black overflow-hidden" style={{ height: "100svh" }}>
      {isInitialLoading && (
        <div style={{ position: "absolute", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "black", color: "rgba(255,255,255,0.8)", pointerEvents: "auto" }}>
          <div style={{ fontSize: 16, fontWeight: "bold", marginBottom: 20 }}>動画を読み込み中...</div>
          <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 2, textAlign: "center" }}>
            <div>⬆︎ 上にスワイプで次の動画</div>
            <div>ダブルタップで5秒スキップ</div>
          </div>
        </div>
      )}

      {isNoResults && (
        <div className="absolute inset-0 z-[9000] flex flex-col items-center justify-center bg-black text-white p-6 text-center pointer-events-auto">
          <p className="text-base font-bold mb-6 leading-relaxed">現在、このジャンルの<br />動画はありません 😢</p>
          <button onClick={() => handleResetFeed([GENRE_ALL])} style={{ padding: "12px 24px", background: "white", color: "black", borderRadius: "30px", fontWeight: "bold", border: "none" }}>
            すべての動画を見る
          </button>
        </div>
      )}

      {!hideGenreMenu && (
        <div className="absolute z-40" data-no-swipe="1" style={{ top: safeTop, left: safeLeft }}>
          <GenreMenu value={genres} onChange={(v) => handleResetFeed(v)} query={query} onChangeQuery={(s) => handleResetFeed(genres, s)} />
        </div>
      )}

      <div className="absolute z-40" data-no-swipe="1" style={{ top: `calc(${safeTop} - 8px)`, right: safeRight }}>
        <MoreMenu />
      </div>

      <div
        ref={containerRef}
        className="hide-scrollbar"
        style={{ width: "100%", height: "100%", overflowY: "auto", overflowX: "hidden", scrollSnapType: "y mandatory", WebkitOverflowScrolling: "touch", overscrollBehaviorY: "contain", background: "#000" }}
      >
        {viewItems.map((item, absIndex) => {
          const distance = Math.abs(absIndex - index);
          const shouldRenderPlayer = distance <= 2;

          return (
            <section key={`${item.id}:${absIndex}`} style={{ position: "relative", width: "100%", height: "100svh", scrollSnapAlign: "start", scrollSnapStop: "always", background: "#000", overflow: "hidden" }}>
              {shouldRenderPlayer ? (
                <VideoCard video={item} isActive={absIndex === index} isNeighbor={distance >= 1} />
              ) : (
                <div style={{ width: "100%", height: "100%", background: "#000" }} />
              )}
            </section>
          );
        })}
      </div>

      {loading && items.length > 0 && (
        <div style={{ position: "absolute", bottom: "calc(env(safe-area-inset-bottom) + 20px)", left: "50%", transform: "translateX(-50%)", zIndex: 200, background: "rgba(0,0,0,0.55)", color: "rgba(255,255,255,0.8)", fontSize: 11, fontWeight: 600, padding: "5px 14px", borderRadius: 20, pointerEvents: "none", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", gap: 6, letterSpacing: "0.02em" }}>
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "rgba(255,255,255,0.9)", animation: "pulse 1s ease-in-out infinite" }} />
          動画を先読み中...
        </div>
      )}
    </div>
  );
}