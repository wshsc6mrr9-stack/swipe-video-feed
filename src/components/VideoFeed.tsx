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

  // aff 互換
  affUrl?: string;
  affLabel?: string;
  affiliateUrl?: string;
  affiliateLabel?: string;

  genres?: string[];
  genre?: string;

  // ✅ いいね数
  likeCount?: number;
};

const EVT_LIKES = "likes_changed_v1";

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

function shuffleWithSeed<T>(arr: T[], seed: number) {
  const a = arr.slice();
  let x = seed || 123456789;
  const rnd = () => {
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ✅ 追加：検索用（全角/半角ゆらぎ対策 + 小文字化）
function normalizeText(s: string) {
  return String(s ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

type Props = {
  /** ジャンルページなどで固定したい時に渡す（例: "amateur"） */
  initialGenre?: GenreKey;
  /** ジャンル固定時にメニューを隠したい場合 */
  hideGenreMenu?: boolean;
};

export default function VideoFeed({ initialGenre, hideGenreMenu }: Props = {}) {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [index, setIndex] = useState(0);
  const [vh, setVh] = useState<number | null>(null);

  // ✅ 複数ジャンル（初期値）
  const [genres, setGenres] = useState<GenreKey[]>(
    initialGenre ? [initialGenre] : [GENRE_ALL]
  );
  const [shuffleSeed, setShuffleSeed] = useState<number>(() => Date.now());

  // ✅ 追加：タイトル検索文字（ジャンル絞り込みにも共用）
  const [query, setQuery] = useState("");

  // ✅ ルートが変わって initialGenre が変わったら追従
  useEffect(() => {
    if (initialGenre) {
      setGenres([initialGenre]);
      setIndex(0);
      setQuery(""); // ✅ 固定ジャンルページに入ったら検索はリセット（不要なら消してOK）
      return;
    }
    setGenres([GENRE_ALL]);
    setIndex(0);
    setShuffleSeed(Date.now());
    setQuery("");
  }, [initialGenre]);

  // ✅ 画面高さ追従
  useEffect(() => {
    const update = () => setVh(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // ✅ 初回：動画一覧ロード + いいね数を一括取得してマージ
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch("/api/videos", { cache: "no-store" });
        const json = await res.json();
        const list = (json?.items ?? json?.data ?? json ?? []) as any[];
        if (!alive) return;

        const normalized: VideoItem[] = list.map((v) => {
          const affUrl = (v?.affUrl ?? v?.affiliateUrl) as string | undefined;
          const affLabel = (v?.affLabel ?? v?.affiliateLabel) as string | undefined;

          return {
            id: String(v.id ?? crypto.randomUUID?.() ?? Math.random()),
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
        });

        // ✅ いいね数をまとめて取得
        try {
          const ids = normalized.map((v) => v.id).filter(Boolean);
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

        setItems(normalized);
        setIndex((i) => Math.min(i, Math.max(0, normalized.length - 1)));
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // ✅ VideoPlayer 側で♡が押されたら items の likeCount を更新
  useEffect(() => {
    const on = (ev: Event) => {
      const e = ev as CustomEvent<{ videoId: string; count: number }>;
      const videoId = e?.detail?.videoId;
      const count = e?.detail?.count;
      if (!videoId || !Number.isFinite(count)) return;

      setItems((prev) =>
        prev.map((v) => (v.id === videoId ? { ...v, likeCount: Number(count) } : v))
      );
    };

    window.addEventListener(EVT_LIKES, on as any);
    return () => window.removeEventListener(EVT_LIKES, on as any);
  }, []);

  // ✅ フィルタ & Allはシャッフル & ♡ランキングは likeCount desc + タイトル検索
  const viewItems = useMemo(() => {
    const sel = Array.isArray(genres) ? genres : [GENRE_ALL];

    // 1) まずジャンルで絞る
    let base: VideoItem[] = items;

    // ♡ランキング（単体だけ）
    if (sel.length === 1 && sel[0] === GENRE_LIKES) {
      base = items
        .slice()
        .sort((a, b) => Number(b.likeCount ?? 0) - Number(a.likeCount ?? 0));
    } else if (sel.length === 0 || (sel.length === 1 && sel[0] === GENRE_ALL)) {
      // All（単体だけ）
      base = shuffleWithSeed(items, shuffleSeed);
    } else {
      // OR フィルタ（複数どれか含めば表示）
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

    // 2) タイトル検索で絞る
    const q = normalizeText(query);
    if (!q) return base;

    return base.filter((v) => {
      const title = normalizeText(v.title);
      const affLabel = normalizeText(v.affLabel ?? v.affiliateLabel ?? "");
      const id = normalizeText(v.id);
      return title.includes(q) || affLabel.includes(q) || id.includes(q);
    });
  }, [items, genres, shuffleSeed, query]);

  // ✅ viewItems が変わったら index を範囲内に
  useEffect(() => {
    setIndex((i) => Math.max(0, Math.min(viewItems.length - 1, i)));
  }, [viewItems.length]);

  const count = viewItems.length;

  const go = useCallback(
    (next: number) => {
      if (!count) return;
      const clamped = Math.max(0, Math.min(count - 1, next));
      setIndex(clamped);
    },
    [count]
  );

  const next = useCallback(() => go(index + 1), [go, index]);
  const prev = useCallback(() => go(index - 1), [go, index]);

  // ===== スワイプ =====
  const dragging = useRef(false);
  const startY = useRef(0);
  const dyRef = useRef(0);
  const startTime = useRef(0);
  const [dragY, setDragY] = useState(0);

  const beginDrag = useCallback((clientY: number) => {
    dragging.current = true;
    startY.current = clientY;
    dyRef.current = 0;
    startTime.current = performance.now();
    setDragY(0);
  }, []);

  const moveDrag = useCallback((clientY: number) => {
    if (!dragging.current) return;
    const dy = clientY - startY.current;
    dyRef.current = dy;
    setDragY(dy);
  }, []);

  const endDrag = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;

    const dy = dyRef.current;
    const dt = performance.now() - startTime.current;
    const v = dt > 0 ? Math.abs(dy) / dt : 0;

    const DIST = 60;
    const VELO = 0.6;

    if (dy < -DIST || (dy < -25 && v > VELO)) next();
    else if (dy > DIST || (dy > 25 && v > VELO)) prev();

    setDragY(0);
  }, [next, prev]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isInteractiveTarget(e.target)) return;

      beginDrag(e.clientY);
      e.preventDefault();
      (e.currentTarget as any).setPointerCapture?.(e.pointerId);
    },
    [beginDrag]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      moveDrag(e.clientY);
      e.preventDefault();
    },
    [moveDrag]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      endDrag();
      e.preventDefault();
    },
    [endDrag]
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isInteractiveTarget(e.target)) return;
      const t = e.touches[0];
      if (!t) return;
      beginDrag(t.clientY);
    },
    [beginDrag]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragging.current) return;
      const t = e.touches[0];
      if (!t) return;
      moveDrag(t.clientY);
      e.preventDefault();
    },
    [moveDrag]
  );

  const onTouchEnd = useCallback(() => {
    if (!dragging.current) return;
    endDrag();
  }, [endDrag]);

  // ✅ wheel/keydown（GenreMenu上では wheel を無視する）
  useEffect(() => {
    const onWheel = (ev: WheelEvent) => {
      const t = ev.target as HTMLElement | null;
      if (t?.closest("[data-no-swipe='1'], [data-ui='controls']")) return;

      if (Math.abs(ev.deltaY) < 10) return;
      if (ev.deltaY > 0) next();
      else prev();
    };

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "ArrowDown" || ev.key === "j") next();
      if (ev.key === "ArrowUp" || ev.key === "k") prev();
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [next, prev]);

  const h = vh ?? 0;

  // ✅ 前/現在/次 の3本だけ描画
  const windowItems = useMemo(() => {
    const cur = viewItems[index];
    const prevItem = index > 0 ? viewItems[index - 1] : undefined;
    const nextItem = index + 1 < viewItems.length ? viewItems[index + 1] : undefined;

    const out: Array<{ item: VideoItem; pos: -1 | 0 | 1 }> = [];
    if (prevItem) out.push({ item: prevItem, pos: -1 });
    if (cur) out.push({ item: cur, pos: 0 });
    if (nextItem) out.push({ item: nextItem, pos: 1 });
    return out;
  }, [viewItems, index]);

  const translateY = dragY;

  // ✅ safe-area 対応（iPhoneノッチ/角丸対策）
  const SAFE_PAD = 12;
  const safeTop = `calc(env(safe-area-inset-top) + ${SAFE_PAD}px)`;
  const safeLeft = `calc(env(safe-area-inset-left) + ${SAFE_PAD}px)`;
  const safeRight = `calc(env(safe-area-inset-right) + ${SAFE_PAD}px)`;

  return (
    <div
      className="relative w-full bg-black overflow-hidden"
      style={{ height: "100svh", touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* ✅ initialGenreで固定してる時はMenuを隠せる */}
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

              // ✅ ALL だけシャッフル更新
              if (v.length === 1 && v[0] === GENRE_ALL) setShuffleSeed(Date.now());
            }}
            query={query}
            onChangeQuery={(s) => {
              setQuery(s);
              setIndex(0); // 検索を変えたら先頭に戻す
            }}
          />
        </div>
      ) : null}

      {/* ✅ 右上 … だけ少し上へ */}
      <div
        className="absolute z-40"
        data-no-swipe="1"
        style={{ top: `calc(${safeTop} - 8px)`, right: safeRight }}
      >
        <MoreMenu />
      </div>

      <div
        style={{
          position: "relative",
          height: vh ? `${vh}px` : "100svh",
          transform: `translate3d(0, ${translateY}px, 0)`,
          transition: dragging.current ? "none" : "transform 220ms ease-out",
          willChange: "transform",
        }}
      >
        {windowItems.map(({ item, pos }) => (
          <div
            key={item.id}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: h ? `${pos * h}px` : 0,
              height: vh ? `${vh}px` : "100svh",
            }}
          >
            <VideoCard
              // @ts-ignore
              video={item}
              // @ts-ignore
              isActive={pos === 0}
              // @ts-ignore
              onNext={next}
              // @ts-ignore
              onPrev={prev}
            />
          </div>
        ))}

        {!viewItems.length && (
          <div className="grid place-items-center text-white h-[100svh]">
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}
