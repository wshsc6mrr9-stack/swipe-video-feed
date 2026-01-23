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

  // iPhoneで一番安定する：scrollTopからindexを算出（軽くスワイプでもOK）
  const onScroll = () => {
    if (!scrollerRef.current) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      const el = scrollerRef.current!;
      const h = el.clientHeight || window.innerHeight || 1;
      const idx = Math.round(el.scrollTop / h);
      const next = Math.min(maxIndex, Math.max(0, idx));
      setActive(next);
    });
  };

  // activeが変わったらそのページへ（ボタン等で使う用）
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const h = el.clientHeight || window.innerHeight || 1;
    const top = active * h;
    // ユーザー操作のスクロールを邪魔しないため、差があるときだけ
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
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="h-[100svh] w-full overflow-y-scroll overflow-x-hidden"
        style={{
          // ✅ iPhoneで超重要
          WebkitOverflowScrolling: "touch",
          scrollSnapType: "y mandatory",
          // “ページ全体が動く” を防ぐ：ここだけスクロールさせる
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
