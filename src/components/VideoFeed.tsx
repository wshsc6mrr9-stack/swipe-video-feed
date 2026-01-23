"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VideoCard from "@/components/VideoCard";

type VideoItem = {
  id: string;
  title: string;

  // 互換
  url?: string;
  src?: string;

  poster?: string;

  // 互換（どっちでも来る想定）
  affUrl?: string;
  affLabel?: string;
  affiliateUrl?: string;
  affiliateLabel?: string;

  genre?: string;
  createdAt?: number;
};

function pickUrl(v: VideoItem) {
  return v.url ?? v.src ?? "";
}

function normalizeVideo(v: VideoItem): VideoItem {
  const affUrl = (v as any).affUrl ?? (v as any).affiliateUrl;
  const affLabel = (v as any).affLabel ?? (v as any).affiliateLabel;
  return {
    ...v,
    url: pickUrl(v),
    affUrl: typeof affUrl === "string" && affUrl.trim() ? affUrl.trim() : undefined,
    affLabel: typeof affLabel === "string" && affLabel.trim() ? affLabel.trim() : undefined,
  };
}

export default function VideoFeed() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [items, setItems] = useState<VideoItem[]>([]);
  const [index, setIndex] = useState(0);

  // 画面高さ（iPhone Safari の 100vh ずれ対策）
  const [vh, setVh] = useState(0);

  // ドラッグ状態
  const [dragY, setDragY] = useState(0);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startTRef = useRef(0);
  const pointerIdRef = useRef<number | null>(null);

  const refreshVh = useCallback(() => {
    const h = rootRef.current?.getBoundingClientRect().height ?? window.innerHeight ?? 0;
    setVh(Math.max(1, Math.round(h)));
  }, []);

  // APIから取得
  const fetchVideos = useCallback(async () => {
    try {
      const res = await fetch("/api/videos", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const raw: VideoItem[] = (json?.items ?? json?.data ?? json?.videos ?? []) as VideoItem[];
      const normalized = raw.map(normalizeVideo).filter((v) => pickUrl(v));
      setItems(normalized);
      setIndex((prev) => {
        const next = Math.min(prev, Math.max(0, normalized.length - 1));
        return Number.isFinite(next) ? next : 0;
      });
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  useEffect(() => {
    refreshVh();
    window.addEventListener("resize", refreshVh);
    window.addEventListener("orientationchange", refreshVh);
    return () => {
      window.removeEventListener("resize", refreshVh);
      window.removeEventListener("orientationchange", refreshVh);
    };
  }, [refreshVh]);

  const active = items[index];

  // 表示するのは前/現在/次の3枚だけ（軽い）
  const windowed = useMemo(() => {
    if (!items.length) return [];
    const prev = index - 1;
    const next = index + 1;
    const list: Array<{ i: number; v: VideoItem }> = [];
    if (prev >= 0) list.push({ i: prev, v: items[prev] });
    if (index >= 0 && index < items.length) list.push({ i: index, v: items[index] });
    if (next < items.length) list.push({ i: next, v: items[next] });
    return list;
  }, [items, index]);

  const clampIndex = useCallback(
    (i: number) => Math.max(0, Math.min(items.length - 1, i)),
    [items.length]
  );

  const commitSwipe = useCallback(
    (direction: "up" | "down") => {
      if (!items.length) return;
      if (direction === "up") setIndex((i) => clampIndex(i + 1));
      if (direction === "down") setIndex((i) => clampIndex(i - 1));
    },
    [items.length, clampIndex]
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!vh) return;
    // スクロール/選択を止める
    e.preventDefault();

    draggingRef.current = true;
    pointerIdRef.current = e.pointerId;
    try {
      (e.currentTarget as any).setPointerCapture?.(e.pointerId);
    } catch {}

    startYRef.current = e.clientY;
    startTRef.current = performance.now();
    setDragY(0);
  }, [vh]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    if (pointerIdRef.current !== e.pointerId) return;

    const dy = e.clientY - startYRef.current;

    // 端で少し抵抗（気持ちよさ）
    const atTop = index === 0;
    const atBottom = index === items.length - 1;
    let eased = dy;

    if ((dy > 0 && atTop) || (dy < 0 && atBottom)) {
      eased = dy * 0.35;
    }

    setDragY(eased);
  }, [index, items.length]);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    if (pointerIdRef.current !== e.pointerId) return;

    draggingRef.current = false;
    pointerIdRef.current = null;

    const dy = dragY;
    const dt = Math.max(1, performance.now() - startTRef.current);
    const vy = dy / dt; // px/ms

    // しきい値：距離 or 速度
    const distThreshold = Math.max(80, vh * 0.18);
    const velocityThreshold = 0.9; // 速いフリック

    const shouldGoNext = dy < -distThreshold || vy < -velocityThreshold;
    const shouldGoPrev = dy > distThreshold || vy > velocityThreshold;

    if (shouldGoNext && index < items.length - 1) {
      commitSwipe("up");
    } else if (shouldGoPrev && index > 0) {
      commitSwipe("down");
    }

    setDragY(0);
  }, [dragY, vh, index, items.length, commitSwipe]);

  const onPointerCancel = useCallback(() => {
    draggingRef.current = false;
    pointerIdRef.current = null;
    setDragY(0);
  }, []);

  // iOS で pointer が怪しい場合の保険（touch）
  const touchIdRef = useRef<number | null>(null);
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!vh) return;
    const t = e.touches[0];
    if (!t) return;
    touchIdRef.current = t.identifier;
    draggingRef.current = true;
    startYRef.current = t.clientY;
    startTRef.current = performance.now();
    setDragY(0);
  }, [vh]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!draggingRef.current) return;
    const id = touchIdRef.current;
    const t = Array.from(e.touches).find((x) => x.identifier === id) ?? e.touches[0];
    if (!t) return;

    // ここで preventDefault しないと “画面の中身全部が指と一緒に動く” になりがち
    e.preventDefault();

    const dy = t.clientY - startYRef.current;

    const atTop = index === 0;
    const atBottom = index === items.length - 1;
    let eased = dy;
    if ((dy > 0 && atTop) || (dy < 0 && atBottom)) eased = dy * 0.35;

    setDragY(eased);
  }, [index, items.length]);

  const onTouchEnd = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;

    const dy = dragY;
    const dt = Math.max(1, performance.now() - startTRef.current);
    const vy = dy / dt;

    const distThreshold = Math.max(80, vh * 0.18);
    const velocityThreshold = 0.9;

    const shouldGoNext = dy < -distThreshold || vy < -velocityThreshold;
    const shouldGoPrev = dy > distThreshold || vy > velocityThreshold;

    if (shouldGoNext && index < items.length - 1) {
      commitSwipe("up");
    } else if (shouldGoPrev && index > 0) {
      commitSwipe("down");
    }

    touchIdRef.current = null;
    setDragY(0);
  }, [dragY, vh, index, items.length, commitSwipe]);

  const onTouchCancel = useCallback(() => {
    draggingRef.current = false;
    touchIdRef.current = null;
    setDragY(0);
  }, []);

  // キーボード（PC）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") commitSwipe("up");
      if (e.key === "ArrowUp") commitSwipe("down");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commitSwipe]);

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 bg-black overflow-hidden select-none"
      style={{
        touchAction: "none",
        overscrollBehavior: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
    >
      {/* スタック表示 */}
      <div className="absolute inset-0">
        {items.length === 0 ? (
          <div className="h-full w-full flex items-center justify-center text-white/70 text-sm">
            読み込み中...
          </div>
        ) : (
          windowed.map(({ i, v }) => {
            const offset = (i - index) * (vh || 1) + dragY;
            const isActive = i === index;

            return (
              <div
                key={v.id}
                className="absolute inset-0 h-full w-full will-change-transform"
                style={{
                  transform: `translate3d(0, ${offset}px, 0)`,
                  transition: draggingRef.current ? "none" : "transform 220ms ease-out",
                }}
              >
                <VideoCard video={v as any} isActive={isActive} />
              </div>
            );
          })
        )}
      </div>

      {/* 右上：更新（必要なら消してOK） */}
      <button
        onClick={() => fetchVideos()}
        className="absolute top-3 right-3 z-50 rounded-md bg-white/90 text-black text-xs px-3 py-2"
      >
        更新
      </button>
    </div>
  );
}
