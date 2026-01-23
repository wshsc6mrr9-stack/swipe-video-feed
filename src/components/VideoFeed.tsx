// src/components/VideoFeed.tsx
"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import VideoCard from "./VideoCard";
import GenreMenu from "@/components/GenreMenu";
import { GENRE_ALL, type GenreKey } from "@/lib/genres";

type AnyVideo = any;

function isNoSwipeTarget(t: EventTarget | null) {
  if (!(t instanceof HTMLElement)) return false;
  return !!t.closest(
    [
      "[data-no-swipe]",
      "a",
      "button",
      "input",
      "textarea",
      "select",
      "label",
      '[role="button"]',
    ].join(",")
  );
}

function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hasGenre(v: AnyVideo, g: string) {
  // ✅ 新：genres 配列
  if (Array.isArray(v?.genres)) {
    return v.genres.map((x: any) => String(x)).includes(g);
  }
  // ✅ 旧：genre 文字列
  return String(v?.genre ?? "other") === g;
}

export default function VideoFeed() {
  const [items, setItems] = useState<AnyVideo[]>([]);
  const [active, setActive] = useState(0);

  const [genre, setGenre] = useState<GenreKey>(GENRE_ALL);

  const [dragY, setDragY] = useState(0);
  const draggingRef = useRef(false);
  const startYRef = useRef<number | null>(null);
  const lastYRef = useRef<number | null>(null);
  const wheelLockRef = useRef(false);

  const fetchVideos = useCallback(async () => {
    const res = await fetch("/api/videos", { cache: "no-store" });
    const json = await res.json().catch(() => null);
    const list = Array.isArray(json?.items) ? json.items : [];
    setItems(list);
  }, []);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const playItems = useMemo(() => {
    const base = Array.isArray(items) ? items : [];
    if (genre === GENRE_ALL) return shuffle(base);

    const filtered = base.filter((v) => hasGenre(v, String(genre)));
    return filtered;
  }, [items, genre]);

  useEffect(() => {
    setActive(0);
    setDragY(0);
    draggingRef.current = false;
    startYRef.current = null;
    lastYRef.current = null;
  }, [genre]);

  useEffect(() => {
    setActive((a) => {
      if (playItems.length === 0) return 0;
      return Math.max(0, Math.min(a, playItems.length - 1));
    });
  }, [playItems.length]);

  const canPrev = active > 0;
  const canNext = active < playItems.length - 1;

  const goPrev = useCallback(() => {
    setActive((a) => Math.max(0, a - 1));
  }, []);

  const goNext = useCallback(() => {
    setActive((a) => a + 1);
  }, []);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (isNoSwipeTarget(e.target)) return;
      if (wheelLockRef.current) return;

      const dy = e.deltaY;
      if (Math.abs(dy) < 10) return;

      wheelLockRef.current = true;
      window.setTimeout(() => (wheelLockRef.current = false), 250);

      if (dy > 0) {
        if (canNext) goNext();
      } else {
        if (canPrev) goPrev();
      }
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [canNext, canPrev, goNext, goPrev]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        if (canNext) goNext();
      }
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        if (canPrev) goPrev();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canNext, canPrev, goNext, goPrev]);

  const threshold = 70;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isNoSwipeTarget(e.target)) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    draggingRef.current = true;
    startYRef.current = e.clientY;
    lastYRef.current = e.clientY;
    setDragY(0);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    if (startYRef.current == null) return;

    const y = e.clientY;
    const dy = y - startYRef.current;
    lastYRef.current = y;

    setDragY(dy * 0.6);
  };

  const endDrag = () => {
    if (!draggingRef.current) return;

    draggingRef.current = false;

    const dy = dragY;

    setDragY(0);
    startYRef.current = null;
    lastYRef.current = null;

    if (dy <= -threshold) {
      if (canNext) goNext();
      return;
    }
    if (dy >= threshold) {
      if (canPrev) goPrev();
      return;
    }
  };

  const onPointerUp = () => endDrag();
  const onPointerCancel = () => endDrag();
  const onPointerLeave = () => endDrag();

  const visible = useMemo(() => {
    if (playItems.length === 0) return [];
    const start = Math.max(0, active - 1);
    const end = Math.min(playItems.length - 1, active + 1);
    const out: { index: number; item: AnyVideo }[] = [];
    for (let i = start; i <= end; i++) out.push({ index: i, item: playItems[i] });
    return out;
  }, [playItems, active]);

  return (
    <div
      className="relative w-full h-[100svh] bg-black overflow-hidden select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onPointerLeave={onPointerLeave}
      style={{ touchAction: "manipulation" }}
    >
      <GenreMenu value={genre} onChange={setGenre} />

      {playItems.length === 0 ? (
        <div className="absolute inset-0 grid place-items-center text-white/70">
          <div className="text-sm">
            {items.length === 0
              ? "動画がありません（/admin で追加してね）"
              : "このジャンルの動画がありません（All に戻してね）"}
          </div>
        </div>
      ) : null}

      {visible.map(({ index, item }) => {
        const offset = (index - active) * 100;
        const translate = `translate3d(0, calc(${offset}svh + ${dragY}px), 0)`;

        return (
          <div
            key={item?.id ?? index}
            className="absolute inset-0 will-change-transform"
            style={{
              transform: translate,
              transition: draggingRef.current ? "none" : "transform 220ms ease-out",
            }}
          >
            <VideoCard video={item} isActive={index === active} />
          </div>
        );
      })}
    </div>
  );
}
