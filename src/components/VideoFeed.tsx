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
const FEED_CACHE_PREFIX = "video_feed_cache_v3";
const LAST_FEED_KEY = "video_feed_last_v1"; // 直近フィードのlocalStorageキー
const INITIAL_COUNT = 5;   // 初回をもう少し増やして最初の詰まりを防ぐ
const NORMAL_COUNT = 20;   // 1回の取得を増やして補充頻度を下げる
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
  return String(s ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeGenreKey(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function buildFeedCacheKey(genres: string[], query: string) {
  const g = [...genres].map(normalizeGenreKey).sort().join("|");
  const q = normalizeText(query);
  return `${FEED_CACHE_PREFIX}:${g}::${q}`;
}

// 直近フィード（全ジャンル）をlocalStorageに保存・読み込み
function saveLastFeed(items: any[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_FEED_KEY, JSON.stringify(items.slice(0, 10)));
  } catch {}
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
  initialVideos?: any[];   // SSRで先読みした初回動画
  initialSeed?: number;    // SSRで使ったseed（ページネーション一貫性のため）
};

export default function VideoFeed({
  initialGenre,
  hideGenreMenu,
  startId,
  initialVideos,
  initialSeed,
}: Props = {}) {
  // 全ジャンル・クエリなしの時だけ直前キャッシュが使える
  const isTopFeed = !initialGenre;

  // 直前訪問のキャッシュ（localStorage）を初期値として使う → 初回ロード待ちゼロ
  // useState内で呼ぶことでStrictModeの二重実行でも安全
  const [items, setItems] = useState<VideoItem[]>(() => {
    if (!isTopFeed) return [];
    return readLastFeed();
  });
  const hasInstantCache = items.length > 0;
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showInitialLoading, setShowInitialLoading] = useState(false);
  const loadingRef = useRef(false);

  const [page, setPage] = useState(1);
  const [seed, setSeed] = useState(() =>
    initialSeed ?? (typeof window !== "undefined" ? Math.floor(Math.random() * 1000000) : 0)
  );
  const [hasMore, setHasMore] = useState(true);

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
  // 直前キャッシュがあればウォームキャッシュ扱い（ローディングスクリーン非表示）
  const [hasWarmCache, setHasWarmCache] = useState(() => hasInstantCache);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const startIdAppliedRef = useRef(false);
  const indexRef = useRef(index);
  const hydratedCacheKeyRef = useRef<string>("");
  const currentCacheKeyRef = useRef<string>("");
  const settleTimerRef = useRef<number | null>(null);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const cacheKey = useMemo(() => {
    return buildFeedCacheKey(genres.map(String), query);
  }, [genres, query]);

  useEffect(() => {
    currentCacheKeyRef.current = cacheKey;
  }, [cacheKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (hydratedCacheKeyRef.current === cacheKey) return;

    hydratedCacheKeyRef.current = cacheKey;
    // 直前キャッシュがある場合はhasWarmCacheをリセットしない
    if (!hasInstantCache) setHasWarmCache(false);

    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      const cachedItems = Array.isArray(parsed?.items) ? parsed.items : [];
      const cachedPage = Number(parsed?.page ?? 1);
      const cachedSeed = Number(parsed?.seed ?? seed);
      const cachedHasMore =
        typeof parsed?.hasMore === "boolean" ? parsed.hasMore : true;

      if (cachedItems.length === 0) return;

      setItems(
        cachedItems.filter((v: any) => v && typeof v.id === "string")
      );
      setPage(Math.max(1, cachedPage));
      setSeed(Number.isFinite(cachedSeed) ? cachedSeed : seed);
      setHasMore(cachedHasMore);
      setHasWarmCache(true);
    } catch {}
  }, [cacheKey, seed]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (items.length === 0) return;
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({
          items,
          page,
          seed,
          hasMore,
          savedAt: Date.now(),
        })
      );
    } catch {}
  }, [cacheKey, items, page, seed, hasMore]);

  useEffect(() => {
    if (!(items.length === 0 && loading && !hasWarmCache)) {
      setShowInitialLoading(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowInitialLoading(true);
    }, INITIAL_LOADING_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [items.length, loading, hasWarmCache]);

  const loadMoreVideos = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;

    loadingRef.current = true;
    setLoading(true);

    try {
      const params = new URLSearchParams();
      const activeGenres = genres.filter(Boolean);
      const isFavMode = activeGenres.includes(GENRE_FAVORITES);

      if (isFavMode) {
        const likedSet = readLikedSet();
        if (likedSet.size === 0) {
          setItems([]);
          setHasMore(false);
          loadingRef.current = false;
          setLoading(false);
          return;
        }
        params.set("ids", Array.from(likedSet).join(","));
      } else {
        const apiGenres = activeGenres.flatMap((g) => {
          if (g === GENRE_FAVORITES || g === GENRE_LIKES) return [g];
          return GENRE_MAP[g] || [];
        });

        if (apiGenres.length > 0) {
          params.set("genres", apiGenres.join(","));
        }

        params.set("page", String(page));
        params.set("seed", String(seed));
      }

      params.set(
        "count",
        String(page === 1 && items.length === 0 ? INITIAL_COUNT : NORMAL_COUNT)
      );

      if (query) params.set("query", query);

      const res = await fetch(`/api/feed?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const list = (Array.isArray(json) ? json : json?.items ?? []) as any[];

      if (!list || list.length === 0) {
        setHasMore(false);
        loadingRef.current = false;
        setLoading(false);
        return;
      }

      const normalized: VideoItem[] = list
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

      setItems((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        return [...prev, ...normalized.filter((n) => !existingIds.has(n.id))];
      });

      // 全ジャンル・クエリなしの最初のページはlocalStorageへ保存（次回即表示用）
      // ※ state updater の外で行う（副作用はsetItems外で）
      if (isTopFeed && !query && page <= 2) {
        saveLastFeed(normalized);
      }

      setPage((p) => p + 1);
    } catch (e) {
      console.error("Load Error:", e);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [genres, hasMore, page, query, seed, items.length]);

  const viewItems = useMemo(() => {
    if (genres.includes(GENRE_FAVORITES)) {
      const likedSet = readLikedSet();
      return items.filter((v) => likedSet.has(v.id));
    }

    if (genres.includes(GENRE_ALL)) return items;

    let base = items;

    if (genres.length === 1 && genres[0] === GENRE_LIKES) {
      base = items
        .slice()
        .sort((a, b) => Number(b.likeCount ?? 0) - Number(a.likeCount ?? 0));
    } else {
      const wantList = genres.flatMap((g) => GENRE_MAP[g] || []);
      if (wantList.length > 0) {
        base = items.filter((v) => {
          const tags = [
            ...(Array.isArray(v.genres) ? v.genres : []),
            v.genre,
          ]
            .filter(Boolean)
            .map(String);

          return tags.some((t) => {
            const lowerT = t.toLowerCase();
            const parts = lowerT.split(/[-_\s]/);
            return wantList.some((w) => {
              const lowerW = w.toLowerCase();
              return lowerT === lowerW || parts.includes(lowerW);
            });
          });
        });
      }
    }

    const q = normalizeText(query);
    if (!q) return base;

    return base.filter((v) => {
      const title = normalizeText(v.title);
      const id = normalizeText(v.id);
      return title.includes(q) || id.includes(q);
    });
  }, [items, genres, query]);

  useEffect(() => {
    if (!hasMore) return;

    if (items.length === 0) {
      loadMoreVideos();
      return;
    }

    const remainingViews = viewItems.length - index;
    if (remainingViews <= 15) {  // 残り15本で次を取得（詰まる前に先読み）
      loadMoreVideos();
    }
  }, [hasMore, index, items.length, loadMoreVideos, viewItems.length]);

  useEffect(() => {
    if (!initialGenre) return;

    let g = initialGenre;
    try {
      g = decodeURIComponent(initialGenre);
    } catch {}

    setGenres([g]);
    setItems([]);
    setIndex(0);
    setPage(1);
    setSeed(Math.floor(Math.random() * 1000000));
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
      el.scrollTo({
        top: found * pageHeight,
        behavior: "auto",
      });
    });
  }, [startId, viewItems]);

  const handleResetFeed = useCallback((nextGenres?: GenreKey[], nextQuery?: string) => {
    const resolvedGenres = nextGenres ?? [GENRE_ALL];

    setGenres(resolvedGenres);
    if (typeof nextQuery === "string") setQuery(nextQuery);
    setItems([]);
    setIndex(0);
    setPage(1);
    setSeed(Math.floor(Math.random() * 1000000));
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

      if (indexRef.current !== clamped) {
        setIndex(clamped);
      }
    };

    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        resolveNearestIndex();
        ticking = false;
      });

      if (settleTimerRef.current) {
        window.clearTimeout(settleTimerRef.current);
      }

      settleTimerRef.current = window.setTimeout(() => {
        resolveNearestIndex();
      }, SCROLL_SETTLE_MS);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      el.removeEventListener("scroll", handleScroll);
      if (settleTimerRef.current) {
        window.clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
    };
  }, [viewItems.length]);

  const SAFE_PAD = 12;
  const safeTop = `calc(env(safe-area-inset-top) + ${SAFE_PAD}px)`;
  const safeLeft = `calc(env(safe-area-inset-left) + ${SAFE_PAD}px)`;
  const safeRight = `calc(env(safe-area-inset-right) + ${SAFE_PAD}px)`;

  const isInitialLoading = items.length === 0 && loading && !hasWarmCache && showInitialLoading;
  const isNoResults = !loading && !hasMore && items.length > 0 && viewItems.length === 0;

  return (
    <div
      className="relative w-full bg-black overflow-hidden"
      style={{ height: "100svh" }}
    >
      {isInitialLoading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "black",
            color: "rgba(255,255,255,0.8)",
            pointerEvents: "auto",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: "bold", marginBottom: 20 }}>
            動画を読み込み中...
          </div>
          <div
            style={{
              fontSize: 13,
              opacity: 0.8,
              lineHeight: 2,
              textAlign: "center",
            }}
          >
            <div>⬆︎ 上にスワイプで次の動画</div>
            <div>ダブルタップで5秒スキップ</div>
          </div>
        </div>
      )}

      {isNoResults && (
        <div className="absolute inset-0 z-[9000] flex flex-col items-center justify-center bg-black text-white p-6 text-center pointer-events-auto">
          <p className="text-base font-bold mb-6 leading-relaxed">
            現在、このジャンルの
            <br />
            動画はありません 😢
          </p>
          <button
            onClick={() => handleResetFeed([GENRE_ALL])}
            style={{
              padding: "12px 24px",
              background: "white",
              color: "black",
              borderRadius: "30px",
              fontWeight: "bold",
              border: "none",
            }}
          >
            すべての動画を見る
          </button>
        </div>
      )}

      {!hideGenreMenu && (
        <div
          className="absolute z-40"
          data-no-swipe="1"
          style={{ top: safeTop, left: safeLeft }}
        >
          <GenreMenu
            value={genres}
            onChange={(v) => handleResetFeed(v)}
            query={query}
            onChangeQuery={(s) => handleResetFeed(genres, s)}
          />
        </div>
      )}

      <div
        className="absolute z-40"
        data-no-swipe="1"
        style={{ top: `calc(${safeTop} - 8px)`, right: safeRight }}
      >
        <MoreMenu />
      </div>

      <div
        ref={containerRef}
        className="hide-scrollbar"
        style={{
          width: "100%",
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorY: "contain",
          background: "#000",
        }}
      >
        {viewItems.map((item, absIndex) => {
          const distance = Math.abs(absIndex - index);
          // 2枚先までレンダリングしてプリロード（黒画面体験をなくす）
          const shouldRenderPlayer = distance <= 2;

          return (
            <section
              key={`${item.id}:${absIndex}`}
              style={{
                position: "relative",
                width: "100%",
                height: "100svh",
                scrollSnapAlign: "start",
                scrollSnapStop: "always",
                background: "#000",
                overflow: "hidden",
              }}
            >
              {shouldRenderPlayer ? (
                <VideoCard
                  video={item}
                  isActive={absIndex === index}
                  isNeighbor={distance >= 1}
                />
              ) : (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "#000",
                  }}
                />
              )}
            </section>
          );
        })}

        {loading && items.length > 0 && (
          <div
            style={{
              height: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(255,255,255,0.55)",
              background: "#000",
              fontSize: 12,
            }}
          >
            読み込み中...
          </div>
        )}
      </div>
    </div>
  );
}