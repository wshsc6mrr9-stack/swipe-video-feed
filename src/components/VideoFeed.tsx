"use client";

import React, { useEffect, useRef, useState } from "react";
import type { VideoItem } from "@/lib/types";
import VideoPlayer from "@/components/VideoPlayer";

const SNAP_MS = 520;
const LOCK_MS = 260;
const DIST_THRESHOLD = 0.35;
const EDGE_RESIST = 0.22;
const MIN_DRAG_PX = 18;
const WHEEL_DEBOUNCE = 280;

export default function VideoFeed() {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);

  const wrapRef = useRef<HTMLDivElement | null>(null);

  const [dragY, setDragY] = useState(0);
  const [anim, setAnim] = useState(false);
  const draggingRef = useRef(false);

  const startYRef = useRef(0);
  const lockUntilRef = useRef(0);
  const wheelLockRef = useRef(0);

  const now = () => Date.now();
  const H = () => wrapRef.current?.clientHeight ?? 0;

  const isLocked = () => now() < lockUntilRef.current;
  const lock = () => (lockUntilRef.current = now() + LOCK_MS);

  async function reload() {
    setLoading(true);
    try {
      const res = await fetch("/api/videos", { cache: "no-store" });
      const json: any = await res.json().catch(() => null);
      const list: VideoItem[] = Array.isArray(json?.items) ? json.items : [];
      setItems(list);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  // ✅ adminで更新されたら反映
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("BroadcastChannel" in window)) return;

    const bc = new BroadcastChannel("videos");
    const onMsg = (e: MessageEvent) => {
      if (e?.data?.type === "videos:updated") reload();
    };
    bc.addEventListener("message", onMsg);
    return () => {
      bc.removeEventListener("message", onMsg);
      bc.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, items.length - 1)));
  }, [items.length]);

  const baseTranslate = () => -H();

  const hasPrev = active > 0;
  const hasNext = active < items.length - 1;

  const prevItem = hasPrev ? items[active - 1] : null;
  const curItem = items[active] ?? null;
  const nextItem = hasNext ? items[active + 1] : null;

  const applyResistance = (dy: number) => {
    if (!hasPrev && dy > 0) return dy * EDGE_RESIST;
    if (!hasNext && dy < 0) return dy * EDGE_RESIST;
    return dy;
  };

  const snapTo = (dir: -1 | 0 | 1) => {
    const h = H();

    setAnim(true);
    setDragY(dir === 0 ? 0 : dir === 1 ? -h : h);

    window.setTimeout(() => {
      setAnim(false);

      if (dir === 1 && hasNext) setActive((a) => a + 1);
      if (dir === -1 && hasPrev) setActive((a) => a - 1);

      setDragY(0);
      lock();
    }, SNAP_MS);
  };

  const onPointerDownCapture = (e: React.PointerEvent) => {
    if (isLocked()) return;

    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "button" || tag === "a") return;

    e.preventDefault();

    draggingRef.current = true;
    setAnim(false);

    startYRef.current = e.clientY;
    setDragY(0);

    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMoveCapture = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    e.preventDefault();

    const dy = e.clientY - startYRef.current;
    const limited = Math.max(-H() * 0.95, Math.min(H() * 0.95, dy));
    setDragY(applyResistance(limited));
  };

  const onPointerUpCapture = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;

    const dy = dragY;
    const h = H();
    const thresholdPx = h * DIST_THRESHOLD;

    if (Math.abs(dy) < MIN_DRAG_PX) {
      snapTo(0);
      return;
    }

    if (dy <= -thresholdPx && hasNext) {
      snapTo(1);
      return;
    }
    if (dy >= thresholdPx && hasPrev) {
      snapTo(-1);
      return;
    }

    snapTo(0);
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();

    const t = now();
    if (t < wheelLockRef.current) return;
    wheelLockRef.current = t + WHEEL_DEBOUNCE;

    if (isLocked()) return;

    if (e.deltaY > 35 && hasNext) snapTo(1);
    if (e.deltaY < -35 && hasPrev) snapTo(-1);
  };

  if (loading) return <div className="h-[100svh] w-full bg-black p-6 text-white/70">読み込み中…</div>;
  if (!curItem) return <div className="h-[100svh] w-full bg-black p-6 text-white/70">動画がありません</div>;

  const translate = baseTranslate() + dragY;

  return (
    <div
      ref={wrapRef}
      className="h-[100svh] w-full bg-black overflow-hidden"
      style={{ touchAction: "none", overscrollBehavior: "none" }}
      onPointerDownCapture={onPointerDownCapture}
      onPointerMoveCapture={onPointerMoveCapture}
      onPointerUpCapture={onPointerUpCapture}
      onPointerCancelCapture={onPointerUpCapture}
      onWheel={onWheel}
    >
      <div
        className="w-full h-[300svh]"
        style={{
          transform: `translateY(${translate}px)`,
          transition: anim ? `transform ${SNAP_MS}ms cubic-bezier(0.16, 1, 0.3, 1)` : "none",
          willChange: "transform",
        }}
      >
        <div className="h-[100svh] w-full">
          {prevItem ? (
            <VideoPlayer key={`prev_${prevItem.id}`} video={prevItem} isActive={false} />
          ) : (
            <div className="h-full w-full bg-black" />
          )}
        </div>

        <div className="h-[100svh] w-full">
          <VideoPlayer key={`cur_${curItem.id}`} video={curItem} isActive />
        </div>

        <div className="h-[100svh] w-full">
          {nextItem ? (
            <VideoPlayer key={`next_${nextItem.id}`} video={nextItem} isActive={false} />
          ) : (
            <div className="h-full w-full bg-black" />
          )}
        </div>
      </div>
    </div>
  );
}
