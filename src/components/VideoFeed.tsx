// src/components/VideoFeed.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VideoCard from "@/components/VideoCard";
import GenreMenu from "@/components/GenreMenu";
import MoreMenu from "@/components/MoreMenu";
import { GENRE_ALL, GENRE_LIKES, type GenreKey } from "@/lib/genres";

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

// ---------------------------
// Helpers
// ---------------------------

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

// 🚨 修正箇所：どんな型(null/undefined)が来てもエラーにならないように変更
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
  startId?: string; // ✅ /video/[id] で最初に表示したい動画
};

export default function VideoFeed({
  initialGenre,
  hideGenreMenu,
  startId,
}: Props = {}) {
  // ✅ 動画データ管理
  const [items, setItems] = useState<VideoItem[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false); // 重複読み込み防止

  // 画面サイズ
  const [vh, setVh] = useState<number>(() =>
    typeof window !== "undefined" ? Math.round(window.innerHeight) : 0
  );

  // ジャンル・検索
  const [genres, setGenres] = useState<GenreKey[]>(
    initialGenre ? [initialGenre] : [GENRE_ALL]
  );
  const [query, setQuery] = useState("");

  // ====== DOM操作用 ======
  const trackRef = useRef<HTMLDivElement | null>(null);
  const setTranslate = useCallback((y: number, transition?: string) => {
    const el = trackRef.current;
    if (!el) return;
    el.style.transition = transition ?? "none";
    el.style.transform = `translate3d(0, ${y}px, 0)`;
  }, []);

  // ====== ドラッグ用変数 ======
  const draggingRef = useRef(false);
  const animatingRef = useRef(false);
  const startYRef = useRef(0);
  const dyRef = useRef(0);
  const startTimeRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);

  // ✅ startId 適用フラグ
  const appliedStartIdRef = useRef<string>("");

  // ✅ indexの非同期参照用
  const indexRef = useRef(index);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  // ===== 高さ追従 =====
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

  // ---------------------------
  // 🚀 無限ロード & データ取得ロジック
  // ---------------------------
  
  const loadMoreVideos = useCallback(async (isFirstLoad = false) => {
    // すでに読み込み中なら中断（連打防止）
    if (loading) return; 
    setLoading(true);

    try {
      // ✅ ランダム取得API (/api/feed) を叩く
      const res = await fetch("/api/feed", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      
      // レスポンスが配列かチェック
      const list = (Array.isArray(json) ? json : json?.items ?? []) as any[];
      
      if (!list.length) {
        setLoading(false);
        return;
      }

      // データの正規化
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

      // いいね数の取得
      try {
        const ids = normalized.map((v) => v.id);
        if (ids.length) {
          const r2 = await fetch(
            `/api/likes?ids=${encodeURIComponent(ids.join(","))}`,
            { cache: "no-store" }
          );
          const j2 = await r2.json().catch(() => null);
          const counts = (j2?.counts ?? {}) as Record<string, number>;
          for (const v of normalized) v.likeCount = Number(counts[v.id] ?? 0);
        }
      } catch {}

      // ステートに追加（重複排除）
      setItems((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newItems = normalized.filter((n) => !existingIds.has(n.id));
        return [...prev, ...newItems];
      });

    } catch (e) {
      console.error("Load Error:", e);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  // ✅ 初回マウント時にロード
  useEffect(() => {
    if (items.length === 0) {
      loadMoreVideos(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ 「残り5本」になったら次を読み込むセンサー
  useEffect(() => {
    if (items.length > 0 && index >= items.length - 5) {
      loadMoreVideos();
    }
  }, [index, items.length, loadMoreVideos]);

  // ---------------------------
  // ジャンル切り替え & 初期化
  // ---------------------------
  useEffect(() => {
    if (startId) return;

    if (initialGenre) {
      setGenres([initialGenre]);
      setIndex(0);
      setQuery("");
      setTranslate(0);
      return;
    }
    // ジャンルが指定されていない場合、ランダムFeedモード
    setGenres([GENRE_ALL]);
    setQuery("");
    
  }, [initialGenre, startId, setTranslate]);

  // ===== likeCount 更新イベント =====
  useEffect(() => {
    const on = (ev: Event) => {
      const e = ev as CustomEvent<{ videoId: string; count: number }>;
      const videoId = e?.detail?.videoId;
      const count = e?.detail?.count;
      if (!videoId || !Number.isFinite(count)) return;

      setItems((prev) =>
        prev.map((v) =>
          v.id === videoId ? { ...v, likeCount: Number(count) } : v
        )
      );
    };

    window.addEventListener(EVT_LIKES, on as any);
    return () => window.removeEventListener(EVT_LIKES, on as any);
  }, []);

  // ---------------------------
  // フィルタリング (クライアントサイド)
  // ---------------------------
  const viewItems = useMemo(() => {
    const sel = Array.isArray(genres) ? genres : [GENRE_ALL];
    
    // ランダムFeedモード(ALL)なら、ロードされたものをそのまま出す
    if (sel.includes(GENRE_ALL)) {
       // 検索クエリがある場合のみフィルタ
       const q = normalizeText(query);
       if (!q) return items;
       return items.filter((v) => {
         return (
           normalizeText(v.title).includes(q) ||
           normalizeText(v.affLabel).includes(q)
         );
       });
    }

    // 特定ジャンル・いいね順の場合
    let base = items;

    if (sel.length === 1 && sel[0] === GENRE_LIKES) {
      base = items
        .slice()
        .sort((a, b) => Number(b.likeCount ?? 0) - Number(a.likeCount ?? 0));
    } else {
      const want = new Set(sel.map(String));
      base = items.filter((v) => {
        const tags = Array.isArray(v.genres)
          ? v.genres
          : typeof v.genre === "string"
          ? [v.genre]
          : [];
        return tags.some((t) => want.has(String(t)));
      });
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

  // ✅ startId 適用
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

  // ✅ index範囲チェック
  useEffect(() => {
    setIndex((i) => Math.max(0, Math.min(viewItems.length - 1, i)));
    setTranslate(0);
  }, [viewItems.length, setTranslate]);

  const count = viewItems.length;
  const h = vh || 0;
  const PEEK = 14;
  const cardH = Math.max(0, h - PEEK * 2);

  // ---------------------------
  // レンダリング用リスト計算
  // ---------------------------
  const windowItems = useMemo(() => {
    const cur = viewItems[index];
    const prevItem = index > 0 ? viewItems[index - 1] : undefined;
    const nextItem =
      index + 1 < viewItems.length ? viewItems[index + 1] : undefined;

    const out: Array<{ item: VideoItem; pos: -1 | 0 | 1; absIndex: number }> =
      [];
    if (prevItem) out.push({ item: prevItem, pos: -1, absIndex: index - 1 });
    if (cur) out.push({ item: cur, pos: 0, absIndex: index });
    if (nextItem) out.push({ item: nextItem, pos: 1, absIndex: index + 1 });
    return out;
  }, [viewItems, index]);

  // ---------------------------
  // ドラッグ & アニメーションロジック
  // ---------------------------
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

    // 前へ戻る or 次へ進む判定
    if ((dy < -DIST || (dy < -25 && v > VELO)) && index < count - 1) {
      finishSlide(-1);
      return;
    }
    if ((dy > DIST || (dy > 25 && v > VELO)) && index > 0) {
      finishSlide(1);
      return;
    }

    setTranslate(0, "transform 160ms ease-out");
    window.setTimeout(() => setTranslate(0, "none"), 170);
  }, [count, finishSlide, h, index, setTranslate]);

  // Pointer Events
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

  // safe-area
  const SAFE_PAD = 12;
  const safeTop = `calc(env(safe-area-inset-top) + ${SAFE_PAD}px)`;
  const safeLeft = `calc(env(safe-area-inset-left) + ${SAFE_PAD}px)`;
  const safeRight = `calc(env(safe-area-inset-right) + ${SAFE_PAD}px)`;

  // ---------------------------
  // JSX Render
  // ---------------------------
  return (
    <div
      className="relative w-full bg-black overflow-hidden"
      style={{ height: "100svh", touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {!hideGenreMenu ? (
        <div
          className="absolute z-40"
          data-no-swipe="1"
          style={{ top: safeTop, left: safeLeft }}
        >
          <GenreMenu
            value={genres}
            onChange={(v) => {
              if (initialGenre) return;
              setGenres(v);
              setIndex(0);
              setTranslate(0, "none");
            }}
            query={query}
            onChangeQuery={(s) => {
              setQuery(s);
              setIndex(0);
              setTranslate(0, "none");
            }}
          />
        </div>
      ) : null}

      <div
        className="absolute z-40"
        data-no-swipe="1"
        style={{ top: `calc(${safeTop} - 8px)`, right: safeRight }}
      >
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
                // @ts-ignore
                video={item}
                // @ts-ignore
                isActive={active}
                // @ts-ignore
                onNext={() => {
                  if (!animatingRef.current && index < count - 1) finishSlide(-1);
                }}
                // @ts-ignore
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