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

  // 互換
  genre?: string;
  genres?: string[];
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

  // UI用（フィルタのキーとして使う）
  genre?: string;
};

function normalizeVideo(v: ApiVideoItem): VideoMeta {
  const affUrl = (v.affUrl ?? v.affiliateUrl ?? undefined)?.trim();
  const affLabel = (v.affLabel ?? v.affiliateLabel ?? undefined)?.trim();

  const g =
    (typeof v.genre === "string" && v.genre.trim() ? v.genre.trim() : "") ||
    (Array.isArray(v.genres) && v.genres.length ? String(v.genres[0] ?? "").trim() : "");

  return {
    id: String(v.id),
    title: String(v.title ?? ""),
    url: v.url,
    src: v.src,
    poster: v.poster,
    srcType: v.srcType,
    affUrl: affUrl ? affUrl : undefined,
    affLabel: affLabel ? affLabel : undefined,
    genre: g || "other",
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

  const go = useCallback((nextIndex: number) => {
    setIndex(() => {
      const max = visibleItemsRef.current.length - 1;
      const clamped = Math.max(0, Math.min(max, nextIndex));
      indexRef.current = clamped;
      return clamped;
    });
  }, []);

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
      const g = (v.genre || "").trim();
      if (g) set.add(g);
    }
    return ["ランダム", ...Array.from(set)];
  }, [items]);

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
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touch.current.active) return;
      if (touch.current.blocked) return;

      const t = e.touches[0];
      const dy = t.clientY - touch.current.startY;
      const dx = t.clientX - touch.current.startX;

      // 軸ロック
      if (!touch.current.lockedAxis) {
        if (Math.abs(dy) > 6 || Math.abs(dx) > 6) {
          touch.current.lockedAxis = Math.abs(dy) >= Math.abs(dx) ? "y" : "x";
        }
      }

      if (touch.current.lockedAxis === "y") {
        draggingRef.current = true;
        e.preventDefault(); // ✅ これが効かないと“指に付く”に戻る
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

  // 軽量化：現在/前/次だけ描画（挙動には触れない）
  const windowed = useMemo(() => {
    const list = visibleItems;
    const start = Math.max(0, index - 1);
    const end = Math.min(list.length - 1, index + 1);
    const slice: Array<{ item: VideoMeta; i: number }> = [];
    for (let i = start; i <= end; i++) slice.push({ item: list[i], i });
    return slice;
  }, [visibleItems, index]);

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
          style={pillBtn}
        >
          {selectedGenre}
        </button>

        {genreOpen ? (
          <div
            data-no-swipe="1"
            style={{
              marginTop: 8,
              background: "rgba(0,0,0,0.85)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14,
              padding: 8,
              width: 220,
              maxHeight: 320,
              overflow: "auto",
              backdropFilter: "blur(8px)",
            }}
          >
            {genres.map((g) => {
              const active = g === selectedGenre;
              return (
                <button
                  key={g}
                  data-no-swipe="1"
                  onClick={() => {
                    setSelectedGenre(g);
                    setGenreOpen(false);
                  }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 10px",
                    borderRadius: 12,
                    border: "none",
                    background: active ? "rgba(255,255,255,0.16)" : "transparent",
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  {g}
                </button>
              );
            })}
          </div>
        ) : null}
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
          style={pillBtn}
        >
          …
        </button>

        {moreOpen ? (
          <div
            data-no-swipe="1"
            style={{
              marginTop: 8,
              background: "rgba(0,0,0,0.85)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14,
              padding: 8,
              width: 220,
              backdropFilter: "blur(8px)",
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

            <a
              data-no-swipe="1"
              href="/admin/login"
              style={{ ...menuBtn, display: "block", textDecoration: "none" } as any}
              onClick={() => setMoreOpen(false)}
            >
              ログインへ
            </a>

            <button
              data-no-swipe="1"
              onClick={() => setMoreOpen(false)}
              style={menuBtn}
            >
              閉じる
            </button>
          </div>
        ) : null}
      </div>

      {/* 中身 */}
      {loading ? (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff" }}>
          Loading...
        </div>
      ) : err ? (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff", padding: 24 }}>
          <div style={{ maxWidth: 420 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>読み込み失敗</div>
            <div style={{ opacity: 0.8, marginBottom: 14 }}>{err}</div>
            <button
              data-no-swipe="1"
              onClick={(e) => {
                e.stopPropagation();
                fetchVideos();
              }}
              style={{
                padding: "12px 14px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.15)",
                color: "#fff",
                border: "none",
                fontWeight: 800,
              }}
            >
              リトライ
            </button>
          </div>
        </div>
      ) : visibleItems.length === 0 ? (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff" }}>
          動画がありません
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: vh * visibleItems.length,
            transform: `translate3d(0, ${translateY}px, 0)`,
            transition: draggingRef.current ? "none" : "transform 220ms ease-out",
            willChange: "transform",
          }}
        >
          {windowed.map(({ item, i }) => {
            const isActive = i === index;
            return (
              <div
                key={item.id}
                style={{
                  position: "absolute",
                  left: 0,
                  top: i * vh,
                  width: "100%",
                  height: vh,
                }}
              >
                <VideoPlayer video={item as any} isActive={isActive} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const pillBtn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.12)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.12)",
  fontWeight: 800,
};

const menuBtn: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
  padding: "10px 10px",
  borderRadius: 12,
  border: "none",
  background: "transparent",
  color: "#fff",
  fontWeight: 800,
};
