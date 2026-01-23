"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VideoCard from "@/components/VideoCard";

// ここが型エラーの元になりやすいので any に逃がす（動作は変えない）
import GenreMenu from "@/components/GenreMenu";
import MoreMenu from "@/components/MoreMenu";
const GenreMenuAny = GenreMenu as any;
const MoreMenuAny = MoreMenu as any;

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
};

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

export default function VideoFeed() {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [index, setIndex] = useState(0);

  const [vh, setVh] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setVh(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/videos", { cache: "no-store" });
        const json = await res.json();
        const list = (json?.items ?? json?.data ?? json ?? []) as any[];
        if (!alive) return;

        const normalized: VideoItem[] = list.map((v) => ({
          id: String(v.id ?? crypto.randomUUID?.() ?? Math.random()),
          title: String(v.title ?? ""),
          url: v.url ?? v.src,
          src: v.src ?? v.url,
          poster: v.poster,
          srcType: v.srcType,
          affUrl: v.affUrl ?? v.affiliateUrl,
          affLabel: v.affLabel ?? v.affiliateLabel,
          affiliateUrl: v.affiliateUrl,
          affiliateLabel: v.affiliateLabel,
        }));

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

  const count = items.length;

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

  // wheel / key（PC用）
  useEffect(() => {
    const onWheel = (ev: WheelEvent) => {
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
  const translateY = useMemo(() => {
    const base = h ? -index * h : 0;
    return base + dragY;
  }, [h, index, dragY]);

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
      {/* 左上 */}
      <div className="absolute top-3 left-3 z-40">
        <GenreMenuAny />
      </div>

      {/* 右上 */}
      <div className="absolute top-3 right-3 z-40">
        <MoreMenuAny />
      </div>

      <div
        style={{
          height: vh ? `${vh}px` : "100svh",
          transform: `translate3d(0, ${translateY}px, 0)`,
          transition: dragging.current ? "none" : "transform 220ms ease-out",
          willChange: "transform",
        }}
      >
        {items.map((video, i) => (
          <div key={video.id} style={{ height: vh ? `${vh}px` : "100svh" }}>
            <VideoCard
              // @ts-ignore: 既存Props差異があっても動かす
              video={video}
              // @ts-ignore
              isActive={i === index}
              // @ts-ignore: VideoCardが要求してる場合に備える
              onNext={next}
              // @ts-ignore
              onPrev={prev}
            />
          </div>
        ))}

        {!items.length && (
          <div className="grid place-items-center text-white h-[100svh]">
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}
