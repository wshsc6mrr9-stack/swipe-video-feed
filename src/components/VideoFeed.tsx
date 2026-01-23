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

export default function VideoFeed() {
  const BUILD = "BUILD_0126";

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

  const ptr = useRef({
    id: -1,
    startY: 0,
    startX: 0,
    lastY: 0,
    startTime: 0,
    active: false,
    lockedAxis: "" as "" | "y" | "x",
  });

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

  // iOSの“指に付いてくるスクロール”を完全停止
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyWidth = body.style.width;
    const prevBodyTop = body.style.top;

    const y = window.scrollY || 0;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.width = "100%";
    body.style.top = `-${y}px`;

    const updateVh = () => setVh(window.innerHeight);
    window.addEventListener("resize", updateVh);
    window.addEventListener("orientationchange", updateVh);

    return () => {
      window.removeEventListener("resize", updateVh);
      window.removeEventListener("orientationchange", updateVh);

      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.position = prevBodyPosition;
      body.style.width = prevBodyWidth;
      body.style.top = prevBodyTop;

      window.scrollTo(0, y);
    };
  }, []);

  const go = useCallback(
    (nextIndex: number) => {
      setIndex(() => {
        const max = items.length - 1;
        const clamped = Math.max(0, Math.min(max, nextIndex));
        indexRef.current = clamped;
        return clamped;
      });
    },
    [items.length]
  );

  const next = useCallback(() => go(indexRef.current + 1), [go]);
  const prev = useCallback(() => go(indexRef.current - 1), [go]);

  // ✅ “動画の上に透明スワイプ層”を置く（iPhone Safariがvideoにイベント奪われる対策）
  const onPointerDown = (e: React.PointerEvent) => {
    ptr.current.id = e.pointerId;
    ptr.current.startY = e.clientY;
    ptr.current.startX = e.clientX;
    ptr.current.lastY = e.clientY;
    ptr.current.startTime = performance.now();
    ptr.current.active = true;
    ptr.current.lockedAxis = "";
    draggingRef.current = false;
    setDragY(0);

    try {
      (e.currentTarget as any).setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!ptr.current.active) return;
    if (e.pointerId !== ptr.current.id) return;

    const dy = e.clientY - ptr.current.startY;
    const dx = e.clientX - ptr.current.startX;

    if (!ptr.current.lockedAxis) {
      if (Math.abs(dy) + Math.abs(dx) < 6) return;
      ptr.current.lockedAxis = Math.abs(dy) >= Math.abs(dx) ? "y" : "x";
    }

    if (ptr.current.lockedAxis === "y") {
      e.preventDefault();
      draggingRef.current = true;

      // 軽く追従
      setDragY(dy * 0.92);
    }

    ptr.current.lastY = e.clientY;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!ptr.current.active) return;
    if (e.pointerId !== ptr.current.id) return;

    const dy = ptr.current.lastY - ptr.current.startY;
    const dt = Math.max(1, performance.now() - ptr.current.startTime);
    const velocity = Math.abs(dy) / dt; // px/ms

    // ✅ “勢い不要”寄り：距離 or 速度で判定（かなり軽く）
    const DIST = Math.max(42, vh * 0.10);
    const FAST = 0.14;

    const shouldMove =
      ptr.current.lockedAxis === "y" &&
      (Math.abs(dy) > DIST || velocity > FAST);

    ptr.current.active = false;

    if (draggingRef.current && shouldMove) {
      if (dy < 0) next();
      else prev();
    }

    draggingRef.current = false;
    ptr.current.lockedAxis = "";
    setDragY(0);

    try {
      (e.currentTarget as any).releasePointerCapture?.(e.pointerId);
    } catch {}
  };

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
        overscrollBehavior: "none",
        touchAction: "none",
      }}
    >
      {/* ✅ 反映チェック：ど真ん中 */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 9999,
          padding: "10px 14px",
          borderRadius: 14,
          background: "rgba(255,255,255,0.20)",
          color: "#fff",
          fontWeight: 900,
          fontSize: 18,
          letterSpacing: 1,
          pointerEvents: "none", // 操作を邪魔しない
          backdropFilter: "blur(6px)",
        }}
      >
        {BUILD}
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
          height: vh * Math.max(1, items.length),
          transform: `translate3d(0, ${translateY}px, 0)`,
          transition: draggingRef.current ? "none" : "transform 220ms ease-out",
          willChange: "transform",
        }}
      >
        {items.map((v, i) => {
          const isActive = i === index;
          return (
            <div
              key={v.id}
              style={{ height: vh, width: "100vw", position: "relative" }}
            >
              {/* 動画 */}
              <div style={{ position: "absolute", inset: 0, zIndex: 1 }}>
                <VideoPlayer video={v as any} isActive={isActive} />
              </div>

              {/* ✅ スワイプ専用の透明レイヤー */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 5,
                  background: "transparent",
                }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
