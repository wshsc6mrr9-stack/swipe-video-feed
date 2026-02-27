// ===== src/components/VideoFeed.tsx =====
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
  const hit = el.closest(
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
  return !!hit;
}

function normalizeText(s: any) {
  return String(s ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function uniq<T>(arr: T[]) {
  return Array.from(new Set(arr));
}

function expandGenreKey(g: string): string[] {
  const base = String(g ?? "").trim();
  if (!base) return [];
  // ★ 重要：日本語キーもそのまま残しつつ、マップがあれば追加で展開（両方投げる）
  return uniq([base, ...(GENRE_MAP[base] ?? [])].filter(Boolean));
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
  const [seed, setSeed] = useState(() =>
    typeof window !== "undefined" ? Math.floor(Math.random() * 1000000) : 0
  );
  const [hasMore, setHasMore] = useState(true);

  const [vh, setVh] = useState<number>(() =>
    typeof window !== "undefined" ? Math.round(window.innerHeight) : 0
  );

  // URLから来る initialGenre をデコードして初期値にする
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
      const next = Math.round(vv?.height ?? window.innerHeight);
      setVh(next);
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

      // ★ APIへ投げるgenres（日本語キーも英語タグも両方投げる）
      const sel = Array.isArray(genres) ? genres : [GENRE_ALL];
      const isAll = sel.includes(GENRE_ALL);
      const isLikes = sel.length === 1 && sel[0] === GENRE_LIKES;
      const isFav = sel.includes(GENRE_FAVORITES);

      const activeGenres = uniq(
        (isAll || isLikes || isFav ? [] : sel)
          .filter(Boolean)
          .flatMap((g) => expandGenreKey(String(g)))
      );

      // ランダム/likes/favorites以外のみ genres を付与（これで「全件」状態が壊れない）
      if (activeGenres.length) params.append("genres", activeGenres.join(","));

      if (query) params.append("query", query);

      params.append("page", String(page));
      params.append("seed", String(seed));
      params.append("_t", Date.now().toString());

      if (isFav) {
        const likedIds = Array.from(readLikedSet());
        if (likedIds.length === 0) {
          setItems([]);
          setHasMore(false);
          setLoading(false);
          return;
        }
        params.append("ids", likedIds.join(","));
      }

      const res = await fetch(`/api/feed?${params.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);

      const list = (Array.isArray(json) ? json : json?.items ?? []) as any[];

      if (!list.length) {
        setHasMore(false);
        setLoading(false);
        return;
      }

      const normalized: VideoItem[] = list
        .map((v) => {
          const affUrl = (v?.affUrl ?? v?.affiliateUrl) as string | undefined;
          const affLabel = (v?.affLabel ?? v?.affiliateLabel) as string | undefined;
          return {
            id: String(v.id ?? ""),
            title: String(v.title ?? ""),
            url: v.url ?? v.src,
            src: v.src ?? v.url,
            poster: v.poster,
            srcType: v.srcType,
            affUrl,
            affLabel,
            affiliateUrl: affUrl,
            affiliateLabel: affLabel,
            genres: Array.isArray(v.genres) ? v.genres : undefined,
            genre: typeof v.genre === "string" ? v.genre : undefined,
            likeCount: 0,
          };
        })
        .filter((v) => !!v.id);

      try {
        const ids = normalized.map((v) => v.id);
        if (ids.length) {
          const r2 = await fetch(`/api/likes?ids=${encodeURIComponent(ids.join(","))}`, {
            cache: "no-store",
          });
          const j2 = await r2.json().catch(() => null);
          const counts = (j2?.counts ?? {}) as Record<string, number>;
          for (const v of normalized) v.likeCount = Number(counts[v.id] ?? 0);
        }
      } catch {}

      setItems((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newOnly = normalized.filter((n) => !existingIds.has(n.id));
        return [...prev, ...newOnly];
      });

      setPage((p) => p + 1);
    } catch (e) {
      console.error("Load Error:", e);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, genres, query, page, seed]);

  useEffect(() => {
    if (items.length === 0 && hasMore) {
      loadMoreVideos();
    }
  }, [items.length, loadMoreVideos, hasMore]);

  useEffect(() => {
    if (items.length > 0 && index >= Math.max(0, items.length - 30) && hasMore) {
      loadMoreVideos();
    }
  }, [index, items.length, loadMoreVideos, hasMore]);

  // URLが変わったときのリセット処理
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
      setSeed(Math.floor(Math.random() * 1000000));
      setHasMore(true);
      setTranslate(0, "none");
    }
  }, [initialGenre, setTranslate]);

  useEffect(() => {
    const on = (ev: Event) => {
      const e = ev as CustomEvent<{ videoId: string; count: number }>;
      const videoId = e?.detail?.videoId;
      const count = e?.detail?.count;
      if (!videoId || !Number.isFinite(count)) return;

      setItems((prev) => prev.map((v) => (v.id === videoId ? { ...v, likeCount: Number(count) } : v)));
    };

    window.addEventListener(EVT_LIKES, on as any);
    return () => window.removeEventListener(EVT_LIKES, on as any);
  }, []);

  // ★ 表示時フィルタ：日本語キーでも英語タグでも一致させる
  const viewItems = useMemo(() => {
    const sel = Array.isArray(genres) ? genres : [GENRE_ALL];

    let base = items;

    if (!sel.includes(GENRE_ALL)) {
      if (sel.length === 1 && sel[0] === GENRE_LIKES) {
        base = items.slice().sort((a, b) => Number(b.likeCount ?? 0) - Number(a.likeCount ?? 0));
      } else if (sel.length === 1 && sel[0] === GENRE_FAVORITES) {
        base = items;
      } else {
        const want = new Set(sel.flatMap((g) => expandGenreKey(String(g))));
        base = items.filter((v) => {
          const tags = [...(Array.isArray(v.genres) ? v.genres : []), v.genre]
            .filter(Boolean)
            .map((x) => String(x));
          return tags.some((t) => want.has(t));
        });
      }
    }

    const q = normalizeText(query);
    if (!q) return base;

    return base.filter((v) => {
      const title = normalizeText(v.title);
      const affLabel = normalizeText(v.affLabel ?? v.affiliateLabel ?? "");
      const id = normalizeText(v.id);
      return title.includes(q) || affLabel.includes(q) || id.includes(q);
    });
  }, [items, genres, query]);

  useEffect(() => {
    const sid = String(startId ?? "").trim();
    if (!sid) return;
    if (!viewItems.length) return;
    if (appliedStartIdRef.current === sid) return;

    const i = viewItems.findIndex((v) => String(v.id) === sid);
    if (i < 0) return;

    setIndex(i);
    setTranslate(0, "none");
    appliedStartIdRef.current = sid;
  }, [startId, viewItems, setTranslate]);

  useEffect(() => {
    if (!startId) {
      setIndex((i) => Math.max(0, Math.min(viewItems.length - 1, i)));
      setTranslate(0);
    }
  }, [viewItems.length, setTranslate, startId]);

  const count = viewItems.length;
  const h = vh || 0;
  const PEEK = 14;
  const cardH = Math.max(0, h - PEEK * 2);

  const windowItems = useMemo(() => {
    const cur = viewItems[index];
    const prevItem = index > 0 ? viewItems[index - 1] : undefined;
    const nextItem = index + 1 < viewItems.length ? viewItems[index + 1] : undefined;

    const out: Array<{ item: VideoItem; pos: -1 | 0 | 1; absIndex: number }> = [];
    if (prevItem) out.push({ item: prevItem, pos: -1, absIndex: index - 1 });
    if (cur) out.push({ item: cur, pos: 0, absIndex: index });
    if (nextItem) out.push({ item: nextItem, pos: 1, absIndex: index + 1 });
    return out;
  }, [viewItems, index]);

  const clampIndex = useCallback(
    (next: number) => {
      if (!count) return 0;
      return Math.max(0, Math.min(count - 1, next));
    },
    [count]
  );

  const finishSlide = useCallback(
    (dir: -1 | 1) => {
      if (!h) return;
      if (animatingRef.current) return;
      animatingRef.current = true;

      const dur = 200;
      const easing = "cubic-bezier(0.22,0.61,0.36,1)";

      setTranslate(dir * h, `transform ${dur}ms ${easing}`);

      window.setTimeout(() => {
        setIndex((cur) => {
          const next = clampIndex(cur + (dir === -1 ? 1 : -1));
          indexRef.current = next;
          return next;
        });

        requestAnimationFrame(() => {
          setTranslate(0, "none");
          window.setTimeout(() => setTranslate(0, "none"), 0);
          animatingRef.current = false;
        });
      }, dur);
    },
    [clampIndex, h, setTranslate]
  );

  const applyRubberBand = useCallback(
    (dy: number) => {
      if (!h) return dy;
      const atTop = index <= 0;
      const atBottom = index >= Math.max(0, count - 1);
      if (atTop && dy > 0) return dy * 0.35;
      if (atBottom && dy < 0) return dy * 0.35;
      return dy;
    },
    [h, index, count]
  );

  const beginDrag = useCallback(
    (clientY: number) => {
      if (animatingRef.current) return;
      draggingRef.current = true;
      startYRef.current = clientY;
      dyRef.current = 0;
      startTimeRef.current = performance.now();
      setTranslate(0, "none");
    },
    [setTranslate]
  );

  const moveDrag = useCallback(
    (clientY: number) => {
      if (!draggingRef.current) return;
      if (animatingRef.current) return;

      const raw = clientY - startYRef.current;
      const dy = applyRubberBand(raw);

      dyRef.current = dy;
      setTranslate(dy, "none");
    },
    [applyRubberBand, setTranslate]
  );

  const endDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;

    if (animatingRef.current) {
      setTranslate(0, "none");
      return;
    }

    const dy = dyRef.current;
    const dt = performance.now() - startTimeRef.current;
    const v = dt > 0 ? Math.abs(dy) / dt : 0;

    const DIST = Math.max(55, h * 0.08);
    const VELO = 0.55;

    if ((dy < -DIST || (dy < -25 && v > VELO)) && index < count - 1) {
      finishSlide(-1);
      return;
    }
    if ((dy > DIST || (dy > 25 && v > VELO)) && index > 0) {
      finishSlide(1);
    }

    setTranslate(0, "transform 160ms ease-out");
    window.setTimeout(() => setTranslate(0, "none"), 170);
  }, [count, finishSlide, h, index, setTranslate]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isInteractiveTarget(e.target)) return;
      if (animatingRef.current) return;
      if (typeof e.button === "number" && e.button !== 0) return;

      pointerIdRef.current = e.pointerId;
      beginDrag(e.clientY);
      (e.currentTarget as any).setPointerCapture?.(e.pointerId);
      e.preventDefault();
    },
    [beginDrag]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return;
      if (!draggingRef.current) return;
      moveDrag(e.clientY);
      e.preventDefault();
    },
    [moveDrag]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return;
      pointerIdRef.current = null;
      endDrag();
      e.preventDefault();
    },
    [endDrag]
  );

  const SAFE_PAD = 12;
  const safeTop = `calc(env(safe-area-inset-top) + ${SAFE_PAD}px)`;
  const safeLeft = `calc(env(safe-area-inset-left) + ${SAFE_PAD}px)`;
  const safeRight = `calc(env(safe-area-inset-right) + ${SAFE_PAD}px)`;

  const isInitialLoading = items.length === 0 && loading;

  return (
    <div
      className="relative w-full bg-black overflow-hidden"
      style={{ height: "100svh", touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
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
            touchAction: "none",
            pointerEvents: "auto",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: "bold", marginBottom: 20 }}>動画を読み込み中...</div>
          <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 2, textAlign: "center" }}>
            <div>⬆︎ 上にスワイプで次の動画</div>
            <div>ダブルタップで5秒スキップ</div>
          </div>
        </div>
      )}

      {!hideGenreMenu ? (
        <div className="absolute z-40" data-no-swipe="1" style={{ top: safeTop, left: safeLeft }}>
          <GenreMenu
            value={genres}
            onChange={(v) => {
              setGenres(v);
              setItems([]);
              setIndex(0);
              setPage(1);
              setSeed(Math.floor(Math.random() * 1000000));
              setHasMore(true);
              setTranslate(0, "none");
            }}
            query={query}
            onChangeQuery={(s) => {
              setQuery(s);
              setItems([]);
              setIndex(0);
              setPage(1);
              setSeed(Math.floor(Math.random() * 1000000));
              setHasMore(true);
              setTranslate(0, "none");
            }}
          />
        </div>
      ) : null}

      <div className="absolute z-40" data-no-swipe="1" style={{ top: `calc(${safeTop} - 8px)`, right: safeRight }}>
        <MoreMenu />
      </div>

      <div
        ref={trackRef}
        style={{
          position: "relative",
          height: vh ? `${vh}px` : "100svh",
          transform: "translate3d(0,0,0)",
          willChange: "transform",
        }}
      >
        {windowItems.map(({ item, pos, absIndex }) => {
          const active = absIndex === index;

          return (
            <div
              key={`${item.id}:${absIndex}`}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: h ? `${pos * h + PEEK}px` : `${PEEK}px`,
                height: `${cardH}px`,
              }}
            >
              <VideoCard
                video={item}
                isActive={active}
                onNext={() => {
                  if (!animatingRef.current && index < count - 1) finishSlide(-1);
                }}
                onPrev={() => {
                  if (!animatingRef.current && index > 0) finishSlide(1);
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}