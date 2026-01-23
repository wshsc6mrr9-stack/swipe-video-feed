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

  // iPhoneの実高さに追従
  const [vh, setVh] = useState<number>(
    typeof window !== "undefined" ? window.innerHeight : 800
  );

  // ドラッグ中のオフセット（px）
  const [dragY, setDragY] = useState(0);
  const draggingRef = useRef(false);

  // swipeを“掴んで離す”を確実にするため PointerCapture を使う
  const pointer = useRef({
    id: -1,
    startY: 0,
    startX: 0,
    lastY: 0,
    startTime: 0,
    active: false,
    blocked: false,
    lockedAxis: "" as "" | "y" | "x",
  });

  // indexRef 同期
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

  // bodyスクロール完全停止（iOS対策：位置も固定してrubberbandを消す）
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;

    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPosition = body.style.position;
    const prevBodyWidth = body.style.width;
    const prevBodyTop = body.style.top;

    const scrollY = window.scrollY || 0;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.width = "100%";
    body.style.top = `-${scrollY}px`;

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

      window.scrollTo(0, scrollY);
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
      setTimeout(() => (lock = false), 300);
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

  // ✅ iPhone/Android：Pointer Eventsで“確実に”スワイプ判定
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onPointerDown = (e: PointerEvent) => {
      // 右クリック等は無視
      if (typeof (e as any).button === "number" && (e as any).button !== 0) return;

      if (isInteractiveTarget(e.target)) {
        pointer.current.blocked = true;
        return;
      }
      pointer.current.blocked = false;

      pointer.current.id = e.pointerId;
      pointer.current.startY = e.clientY;
      pointer.current.startX = e.clientX;
      pointer.current.lastY = e.clientY;
      pointer.current.startTime = performance.now();
      pointer.current.active = true;
      pointer.current.lockedAxis = "";
      draggingRef.current = false;
      setDragY(0);

      // ここが肝：指が外に行ってもイベントを取り続ける
      try {
        (e.target as Element | null)?.setPointerCapture?.(e.pointerId);
      } catch {}
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pointer.current.active) return;
      if (pointer.current.blocked) return;
      if (e.pointerId !== pointer.current.id) return;

      const dy = e.clientY - pointer.current.startY;
      const dx = e.clientX - pointer.current.startX;

      // 早めに方向ロック（少し動いたら決め打ち）
      if (!pointer.current.lockedAxis) {
        if (Math.abs(dy) + Math.abs(dx) < 6) return;
        pointer.current.lockedAxis = Math.abs(dy) >= Math.abs(dx) ? "y" : "x";
      }

      // 縦ロックなら、ブラウザスクロールを完全に殺してドラッグ追従
      if (pointer.current.lockedAxis === "y") {
        // iOSでスクロールに奪われるのを防ぐ
        e.preventDefault?.();
        draggingRef.current = true;

        // 抵抗（少し軽くする：指に付いてくる感は残しつつ）
        const resistance = 0.92;
        setDragY(dy * resistance);
      }

      pointer.current.lastY = e.clientY;
    };

    const finish = (e?: PointerEvent) => {
      if (!pointer.current.active) return;
      if (pointer.current.blocked) {
        pointer.current.active = false;
        pointer.current.blocked = false;
        pointer.current.lockedAxis = "";
        return;
      }

      const dy = pointer.current.lastY - pointer.current.startY;
      const dt = Math.max(1, performance.now() - pointer.current.startTime);
      const velocity = Math.abs(dy) / dt; // px/ms

      const absDy = Math.abs(dy);

      // ✅ ここを“かなり軽く”する（勢い不要に寄せる）
      // 距離：画面の 12% 以上 or 48px
      // 速度：0.18px/ms 以上なら距離が短くてもOK
      const DIST = Math.max(48, vh * 0.12);
      const FAST = 0.18;

      const shouldMove =
        pointer.current.lockedAxis === "y" &&
        (absDy > DIST || velocity > FAST);

      pointer.current.active = false;

      if (draggingRef.current && shouldMove) {
        if (dy < 0) next();
        else prev();
      }

      draggingRef.current = false;
      pointer.current.lockedAxis = "";
      setDragY(0);

      if (e && typeof e.pointerId === "number") {
        try {
          (e.target as Element | null)?.releasePointerCapture?.(e.pointerId);
        } catch {}
      }
    };

    el.addEventListener("pointerdown", onPointerDown, { passive: true });
    // move/up は preventDefault するので passive:false
    el.addEventListener("pointermove", onPointerMove, { passive: false });
    el.addEventListener("pointerup", finish as any, { passive: true });
    el.addEventListener("pointercancel", finish as any, { passive: true });

    return () => {
      el.removeEventListener("pointerdown", onPointerDown as any);
      el.removeEventListener("pointermove", onPointerMove as any);
      el.removeEventListener("pointerup", finish as any);
      el.removeEventListener("pointercancel", finish as any);
    };
  }, [next, prev, vh]);

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

        // ✅ iOS Safari 対策セット
        touchAction: "none", // pointer events を自前に
        overscrollBehavior: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
      }}
    >
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

      {/* TikTok風：縦に積んで translateY */}
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
            <div key={v.id} style={{ height: vh, width: "100vw" }}>
              <VideoPlayer video={v as any} isActive={isActive} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
