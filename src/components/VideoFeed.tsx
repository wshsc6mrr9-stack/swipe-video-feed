"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VideoPlayer from "@/components/VideoPlayer";

type ApiVideoItem = {
  id: string;
  title: string;
  url?: string;
  src?: string;
  poster?: string;
  srcType?: "mp4" | "hls";
  createdAt?: number;

  affUrl?: string;
  affLabel?: string;
  affiliateUrl?: string;
  affiliateLabel?: string;

  genre?: string;
};

type VideoMeta = {
  id: string;
  title: string;
  url?: string;
  src?: string;
  poster?: string;
  srcType?: "mp4" | "hls";
  affUrl?: string;
  affLabel?: string;
  genre?: string;
};

function normalizeVideo(v: ApiVideoItem): VideoMeta {
  const affUrl = (v.affUrl ?? v.affiliateUrl ?? undefined)?.trim();
  const affLabel = (v.affLabel ?? v.affiliateLabel ?? undefined)?.trim();

  return {
    id: v.id,
    title: v.title,
    url: v.url,
    src: v.src,
    poster: v.poster,
    srcType: v.srcType,
    affUrl: affUrl ? affUrl : undefined,
    affLabel: affLabel ? affLabel : undefined,
    genre: v.genre,
  };
}

function isInteractiveTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return !!el.closest(
    'button, a, input, textarea, select, label, [role="slider"], [data-no-swipe="1"]'
  );
}

export default function VideoFeed() {
  const [items, setItems] = useState<VideoMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const [vh, setVh] = useState<number>(
    typeof window !== "undefined" ? window.innerHeight : 800
  );

  const [dragY, setDragY] = useState(0);
  const draggingRef = useRef(false);

  const touch = useRef({
    startY: 0,
    startX: 0,
    lastY: 0,
    startTime: 0,
    active: false,
    blocked: false,
    lockedAxis: "" as "" | "y" | "x",
  });

  // 左上ジャンル / 右上 …
  const [genreOpen, setGenreOpen] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string>("ランダム");
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/videos", { cache: "no-store" });
      const data = (await res.json()) as {
        ok: boolean;
        items?: ApiVideoItem[];
        error?: string;
      };
      if (!data?.ok) throw new Error(data?.error || "API error");
      const list = (data.items ?? []).map(normalizeVideo);
      setItems(list);
      setIndex((prev) => Math.min(prev, Math.max(0, list.length - 1)));
    } catch (e: any) {
      setErr(e?.message || "fetch failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // ✅ iOSの“指に付いてくる”を根絶（body固定 + overscroll抑制）
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prev = {
      htmlOverflow: html.style.overflow,
      htmlOverscroll: (html.style as any).overscrollBehaviorY,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyWidth: body.style.width,
      bodyTop: body.style.top,
      bodyTouchAction: (body.style as any).touchAction,
    };

    html.style.overflow = "hidden";
    (html.style as any).overscrollBehaviorY = "none";

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.width = "100%";
    body.style.top = "0";
    (body.style as any).touchAction = "none";

    const updateVh = () => setVh(window.innerHeight);
    window.addEventListener("resize", updateVh);
    window.addEventListener("orientationchange", updateVh);

    return () => {
      window.removeEventListener("resize", updateVh);
      window.removeEventListener("orientationchange", updateVh);

      html.style.overflow = prev.htmlOverflow;
      (html.style as any).overscrollBehaviorY = prev.htmlOverscroll;

      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.width = prev.bodyWidth;
      body.style.top = prev.bodyTop;
      (body.style as any).touchAction = prev.bodyTouchAction;
    };
  }, []);

  const go = useCallback(
    (nextIndex: number) => {
      setIndex(() => {
        const max = visibleItemsRef.current.length - 1;
        const clamped = Math.max(0, Math.min(max, nextIndex));
        indexRef.current = clamped;
        return clamped;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const next = useCallback(() => go(indexRef.current + 1), [go]);
  const prev = useCallback(() => go(indexRef.current - 1), [go]);

  // PC wheel
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let lock = false;
    const onWheel = (e: WheelEvent) => {
      if (lock) return;
      if (Math.abs(e.deltaY) < 10) return;
      lock = true;
      if (e.deltaY > 0) next();
      else prev();
      setTimeout(() => (lock = false), 350);
    };

    el.addEventListener("wheel", onWheel, { passive: true });
    return () => el.removeEventListener("wheel", onWheel as any);
  }, [next, prev]);

  // PC keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") next();
      if (e.key === "ArrowUp") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const genres = useMemo(() => {
    const set = new Set<string>();
    for (const v of items) {
      if (typeof v.genre === "string" && v.genre.trim()) set.add(v.genre.trim());
    }
    return ["ランダム", ...Array.from(set)];
  }, [items]);

  const visibleItems = useMemo(() => {
    if (selectedGenre === "ランダム") return items;
    return items.filter((v) => (v.genre || "").trim() === selectedGenre);
  }, [items, selectedGenre]);

  // go() から items.length を参照できるようにRef化
  const visibleItemsRef = useRef<VideoMeta[]>(visibleItems);
  useEffect(() => {
    visibleItemsRef.current = visibleItems;
    const max = Math.max(0, visibleItems.length - 1);
    setIndex((prevIdx) => Math.min(prevIdx, max));
    indexRef.current = Math.min(indexRef.current, max);
  }, [visibleItems]);

  // ✅ iPhone swipe（確実版）
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (genreOpen || moreOpen) {
        touch.current.blocked = true;
        return;
      }
      if (isInteractiveTarget(e.target)) {
        touch.current.blocked = true;
        return;
      }
      touch.current.blocked = false;

      const t = e.touches[0];
      touch.current.startY = t.clientY;
      touch.current.startX = t.clientX;
      touch.current.lastY = t.clientY;
      touch.current.startTime = performance.now();
      touch.current.active = true;
      touch.current.lockedAxis = "";
      draggingRef.current = false;
      setDragY(0);

      // ✅ ここで passive:false にした上で“開始直後に”止めれる準備
      // （この時点ではまだ止めない。縦判定した瞬間だけ止める）
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touch.current.active) return;
      if (touch.current.blocked) return;

      const t = e.touches[0];
      const dy = t.clientY - touch.current.startY;
      const dx = t.clientX - touch.current.startX;

      // 軸ロック（最初に優勢になった方へ固定）
      if (!touch.current.lockedAxis) {
        if (Math.abs(dy) > 6 || Math.abs(dx) > 6) {
          touch.current.lockedAxis = Math.abs(dy) >= Math.abs(dx) ? "y" : "x";
        }
      }

      if (touch.current.lockedAxis === "y") {
        draggingRef.current = true;
        e.preventDefault(); // ✅ ここが効かないと“指に付く”に戻る
        setDragY(dy);
      }

      touch.current.lastY = t.clientY;
    };

    const onTouchEnd = () => {
      if (!touch.current.active) return;

      const dy = touch.current.lastY - touch.current.startY;
      const dt = Math.max(1, performance.now() - touch.current.startTime);
      const velocity = Math.abs(dy) / dt;

      touch.current.active = false;

      // ✅ 軽いスワイプでも行く（でも誤爆しすぎない）
      const DIST = 45;
      const FAST = 0.28;
      const shouldMove = Math.abs(dy) > DIST || velocity > FAST;

      if (draggingRef.current && shouldMove) {
        if (dy < 0) next();
        else prev();
      }

      draggingRef.current = false;
      touch.current.lockedAxis = "";
      setDragY(0);
    };

    // ✅ touchstart も passive:false にする（端末差の保険）
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart as any);
      el.removeEventListener("touchmove", onTouchMove as any);
      el.removeEventListener("touchend", onTouchEnd as any);
      el.removeEventListener("touchcancel", onTouchEnd as any);
    };
  }, [next, prev, genreOpen, moreOpen]);

  const translateY = useMemo(() => {
    return -index * vh + dragY;
  }, [index, vh, dragY]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        inset: 0,
        height: "100dvh",
        width: "100vw",
        overflow: "hidden",
        background: "black",
        touchAction: "none",
        overscrollBehavior: "none",
      }}
      onClick={() => {
        if (genreOpen) setGenreOpen(false);
        if (moreOpen) setMoreOpen(false);
      }}
    >
      {/* 左上：ジャンル */}
      <div
        data-no-swipe="1"
        style={{ position: "absolute", top: 12, left: 12, zIndex: 80 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          data-no-swipe="1"
          onClick={() => {
            setMoreOpen(false);
            setGenreOpen((v) => !v);
          }}
          style={{
            padding: "8px 12px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.12)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.15)",
            fontWeight: 800,
          }}
        >
          {selectedGenre}
        </button>

        {genreOpen && (
          <div
            data-no-swipe="1"
            style={{
              marginTop: 8,
              width: 180,
              borderRadius: 14,
              overflow: "hidden",
              background: "rgba(20,20,20,0.92)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            }}
          >
            {genres.map((g) => (
              <button
                key={g}
                data-no-swipe="1"
                onClick={() => {
                  setSelectedGenre(g);
                  setGenreOpen(false);
                  setIndex(0);
                  indexRef.current = 0;
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  background: g === selectedGenre ? "rgba(255,255,255,0.12)" : "transparent",
                  color: "#fff",
                  border: "none",
                }}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 右上：… */}
      <div
        data-no-swipe="1"
        style={{ position: "absolute", top: 12, right: 12, zIndex: 80 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          data-no-swipe="1"
          onClick={() => {
            setGenreOpen(false);
            setMoreOpen((v) => !v);
          }}
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            background: "rgba(255,255,255,0.12)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.15)",
            fontWeight: 900,
            fontSize: 18,
            lineHeight: "40px",
          }}
          aria-label="more"
        >
          …
        </button>

        {moreOpen && (
          <div
            data-no-swipe="1"
            style={{
              marginTop: 8,
              width: 200,
              borderRadius: 14,
              overflow: "hidden",
              background: "rgba(20,20,20,0.92)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              transform: "translateX(-160px)",
            }}
          >
            <button
              data-no-swipe="1"
              onClick={() => {
                setMoreOpen(false);
                fetchVideos();
              }}
              style={menuBtn}
            >
              再読み込み
            </button>
            <a
              data-no-swipe="1"
              href="/admin"
              style={{ ...menuBtn, display: "block", textDecoration: "none" } as any}
              onClick={() => setMoreOpen(false)}
            >
              管理画面へ
            </a>
            <button data-no-swipe="1" onClick={() => setMoreOpen(false)} style={menuBtn}>
              閉じる
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            color: "#fff",
            zIndex: 50,
          }}
        >
          Loading...
        </div>
      )}

      {err && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            color: "#fff",
            zIndex: 50,
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ marginBottom: 12 }}>エラー: {err}</div>
            <button
              onClick={fetchVideos}
              style={{
                padding: "10px 14px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.15)",
                color: "#fff",
              }}
            >
              再読み込み
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          height: vh * Math.max(1, visibleItems.length),
          transform: `translate3d(0, ${translateY}px, 0)`,
          transition: draggingRef.current ? "none" : "transform 240ms ease-out",
          willChange: "transform",
        }}
      >
        {visibleItems.map((v, i) => {
          const isActive = i === index;
          return (
            <div key={v.id} style={{ height: vh, width: "100vw" }}>
              <VideoPlayer video={v as any} isActive={isActive} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

const menuBtn: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
  padding: "10px 12px",
  background: "transparent",
  color: "#fff",
  border: "none",
};
