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

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

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

  const maxIndex = Math.max(0, items.length - 1);

  // scrollTop から index を算出（scroll-snap方式）
  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const h = el.clientHeight || window.innerHeight || 1;
      const idx = Math.round(el.scrollTop / h);
      const next = Math.min(maxIndex, Math.max(0, idx));
      setActive(next);
    });
  };

  // active変更時に該当位置へ（ズレがある時だけ）
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const h = el.clientHeight || window.innerHeight || 1;
    const top = active * h;
    if (Math.abs(el.scrollTop - top) > 2) {
      el.scrollTo({ top, behavior: "smooth" });
    }
  }, [active]);

  if (!items.length) {
    return (
      <div className="h-[100svh] w-full bg-black text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      {/* ✅ 目印：これが本番iPhoneに出なければ「反映できてない」が確定 */}
      <div className="absolute left-2 top-2 z-[9999] rounded bg-white/80 px-2 py-1 text-xs text-black">
        SNAP_BUILD_0123
      </div>

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="h-[100svh] w-full overflow-y-scroll overflow-x-hidden"
        style={{
          WebkitOverflowScrolling: "touch",
          scrollSnapType: "y mandatory",
          overscrollBehavior: "none",
          touchAction: "pan-y",
        }}
      >
        {items.map((video, i) => (
          <section
            key={video.id}
            className="h-[100svh] w-full"
            style={{
              scrollSnapAlign: "start",
              scrollSnapStop: "always",
            }}
          >
            <VideoPlayer video={video as any} isActive={i === active} />
          </section>
        ))}
      </div>
    </div>
  );
}
