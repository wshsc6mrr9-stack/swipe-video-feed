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

  // 互換（どっちでも来る可能性）
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
  // スライダーやボタン上での操作は優先（ここでスワイプ開始しない）
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

  // iPhoneの実高さに追従
  const [vh, setVh] = useState<number>(typeof window !== "undefined" ? window.innerHeight : 800);

  // ドラッグ中のオフセット（px）
  const [dragY, setDragY] = useState(0);
  const draggingRef = useRef(false);

  const touch = useRef({
    startY: 0,
    startX: 0,
    lastY: 0,
    startTime: 0,
    active: false,
    blocked: false,
  });

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/videos", { cache: "no-store" });
      const data = (await res.json()) as { ok: boolean; items?: ApiVideoItem[]; error?: string };
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

  // bodyスクロール完全停止（iOS対策）
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyWidth = body.style.width;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.width = "100%";

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
    };
  }, []);

  const go = useCallback(
    (nextIndex: number) => {
      setIndex((prev) => {
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

  // マウスホイール（PC）
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

  // キーボード（PC）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") next();
      if (e.key === "ArrowUp") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // タッチ（iPhone）: 軽いスワイプでも確実に反応させる
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
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
      draggingRef.current = false;
      setDragY(0);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touch.current.active) return;
      if (touch.current.blocked) return;

      const t = e.touches[0];
      const dy = t.clientY - touch.current.startY;
      const dx = t.clientX - touch.current.startX;

      // 縦優先になった瞬間から“ページスクロール”を止める
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 6) {
        draggingRef.current = true;
        // ここが超重要：iPhoneでページが指に付いてくるのを止める
        e.preventDefault();
        setDragY(dy);
      }

      touch.current.lastY = t.clientY;
    };

    const onTouchEnd = () => {
      if (!touch.current.active) return;
      const dy = touch.current.lastY - touch.current.startY;
      const dt = Math.max(1, performance.now() - touch.current.startTime);
      const velocity = Math.abs(dy) / dt; // px/ms

      touch.current.active = false;

      // “軽いスワイプでも行く”判定
      const DIST = 55; // 距離しきい値（小さめ）
      const FAST = 0.35; // 速度しきい値（小さめ）

      const shouldMove = Math.abs(dy) > DIST || velocity > FAST;

      if (draggingRef.current && shouldMove) {
        if (dy < 0) next();
        else prev();
      }

      draggingRef.current = false;
      setDragY(0);
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    // touchmoveは passive:false じゃないと preventDefault が効かない
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart as any);
      el.removeEventListener("touchmove", onTouchMove as any);
      el.removeEventListener("touchend", onTouchEnd as any);
      el.removeEventListener("touchcancel", onTouchEnd as any);
    };
  }, [next, prev]);

  const translateY = useMemo(() => {
    // 現在index分 + ドラッグ中のオフセット
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
      }}
    >
      {loading && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff", zIndex: 50 }}>
          Loading...
        </div>
      )}

      {err && (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#fff", zIndex: 50 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ marginBottom: 12 }}>エラー: {err}</div>
            <button
              onClick={fetchVideos}
              style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(255,255,255,0.15)", color: "#fff" }}
            >
              再読み込み
            </button>
          </div>
        </div>
      )}

      {/* ここが“TikTokっぽい”本体：縦に積んで translateY で移動 */}
      <div
        style={{
          height: vh * Math.max(1, items.length),
          transform: `translate3d(0, ${translateY}px, 0)`,
          transition: draggingRef.current ? "none" : "transform 260ms ease-out",
        }}
      >
        {items.map((v, i) => {
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
