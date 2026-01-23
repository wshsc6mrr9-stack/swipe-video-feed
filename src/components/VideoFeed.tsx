"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import VideoPlayer from "@/components/VideoPlayer";

type VideoMeta = {
  id: string;
  title: string;
  url?: string;
  src?: string;
  poster?: string;
  affUrl?: string;
  affLabel?: string;
  affiliateUrl?: string;
  affiliateLabel?: string;
};

function normalizeVideo(v: any): VideoMeta {
  return {
    id: String(v?.id ?? crypto.randomUUID()),
    title: String(v?.title ?? ""),
    url: v?.url ?? v?.src,
    src: v?.src ?? v?.url,
    poster: v?.poster,
    affUrl: v?.affUrl ?? v?.affiliateUrl,
    affLabel: v?.affLabel ?? v?.affiliateLabel,
    affiliateUrl: v?.affiliateUrl ?? v?.affUrl,
    affiliateLabel: v?.affiliateLabel ?? v?.affLabel,
  };
}

export default function VideoFeed() {
  const [items, setItems] = useState<VideoMeta[]>([]);
  const [active, setActive] = useState(0);

  const [vh, setVh] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  const wrapRef = useRef<HTMLDivElement | null>(null);

  const stateRef = useRef({
    touching: false,
    startY: 0,
    lastY: 0,
    startT: 0,
    lastT: 0,
    active: 0,
    maxIndex: 0,
    vh: 0,
  });

  // fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch("/api/videos", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      const list = (data?.items ?? data?.videos ?? []) as any[];
      if (!cancelled) setItems(list.map(normalizeVideo));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // height
  useEffect(() => {
    const update = () => setVh(window.innerHeight || 0);
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  const maxIndex = Math.max(0, items.length - 1);
  const clampIndex = (n: number) => Math.min(maxIndex, Math.max(0, n));

  // 判定（軽いフリックでも行く）
  const thresholds = useMemo(() => {
    const h = vh || 800;
    return {
      dist: Math.min(70, Math.max(35, h * 0.08)),
      vel: 0.35, // px/ms
    };
  }, [vh]);

  const rubberBand = (dy: number, a: number) => {
    if ((a === 0 && dy > 0) || (a === maxIndex && dy < 0)) return dy * 0.35;
    return dy;
  };

  const shouldIgnoreStart = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    return !!el?.closest("button,a,input,textarea,select,label");
  };

  // ✅ ここが本命：iOSのページスクロールを確実に殺す
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyWidth: body.style.width,
      bodyHeight: body.style.height,
      bodyTouchAction: (body.style as any).touchAction,
      htmlOverscroll: (html.style as any).overscrollBehavior,
      bodyOverscroll: (body.style as any).overscrollBehavior,
    };

    html.style.overflow = "hidden";
    (html.style as any).overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.position = "fixed"; // ← iOSで効く
    body.style.width = "100%";
    body.style.height = "100%";
    (body.style as any).touchAction = "none";
    (body.style as any).overscrollBehavior = "none";

    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.width = prev.bodyWidth;
      body.style.height = prev.bodyHeight;
      (body.style as any).touchAction = prev.bodyTouchAction;
      (html.style as any).overscrollBehavior = prev.htmlOverscroll;
      (body.style as any).overscrollBehavior = prev.bodyOverscroll;
    };
  }, []);

  // ✅ ネイティブ touch listener（passive:false で preventDefault を確実に効かせる）
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) return;
      if (shouldIgnoreStart(e.target)) return;

      const t = e.touches[0];
      stateRef.current.touching = true;
      stateRef.current.startY = t.clientY;
      stateRef.current.lastY = t.clientY;
      const now = performance.now();
      stateRef.current.startT = now;
      stateRef.current.lastT = now;

      setDragging(true);
      setDragY(0);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!stateRef.current.touching) return;
      if (e.touches.length > 1) return;

      // これが効くのが重要（passive:false）
      e.preventDefault();

      const t = e.touches[0];
      const dy = t.clientY - stateRef.current.startY;
      stateRef.current.lastY = t.clientY;
      stateRef.current.lastT = performance.now();

      const a = stateRef.current.active;
      setDragY(rubberBand(dy, a));
    };

    const onTouchEnd = () => {
      if (!stateRef.current.touching) return;
      stateRef.current.touching = false;

      setDragging(false);

      const dy = stateRef.current.lastY - stateRef.current.startY;
      const dt = Math.max(1, stateRef.current.lastT - stateRef.current.startT);
      const v = dy / dt;

      const goNext = dy < -thresholds.dist || v < -thresholds.vel;
      const goPrev = dy > thresholds.dist || v > thresholds.vel;

      setActive((cur) => {
        const next = goNext ? clampIndex(cur + 1) : goPrev ? clampIndex(cur - 1) : cur;
        // stateRefにも反映（rubberBand用）
        stateRef.current.active = next;
        return next;
      });

      setDragY(0);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart as any);
      el.removeEventListener("touchmove", onTouchMove as any);
      el.removeEventListener("touchend", onTouchEnd as any);
      el.removeEventListener("touchcancel", onTouchEnd as any);
    };
  }, [thresholds.dist, thresholds.vel, maxIndex]);

  // stateRef 更新（active/maxIndex/vh）
  useEffect(() => {
    stateRef.current.active = active;
    stateRef.current.maxIndex = maxIndex;
    stateRef.current.vh = vh;
  }, [active, maxIndex, vh]);

  const translateY = useMemo(() => {
    const h = vh || 0;
    return -(active * h) + dragY;
  }, [active, vh, dragY]);

  if (!items.length) {
    return (
      <div className="h-[100svh] w-full bg-black text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className="relative w-full h-[100svh] overflow-hidden bg-black select-none"
      style={{
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
      }}
    >
      <div
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `translate3d(0, ${translateY}px, 0)`,
          transition: dragging ? "none" : "transform 240ms ease",
        }}
      >
        {items.map((video, i) => (
          <div key={video.id} className="w-full h-[100svh]">
            <VideoPlayer video={video as any} isActive={i === active} />
          </div>
        ))}
      </div>
    </div>
  );
}
