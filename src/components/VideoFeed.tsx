"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import VideoPlayer from "@/components/VideoPlayer";
import type { VideoMeta } from "@/lib/types";

type ApiRes =
  | { ok: true; items: any[] }
  | { ok: false; error?: string };

function normalizeVideo(v: any): VideoMeta {
  return {
    id: String(v.id),
    title: String(v.title ?? ""),
    // 互換：url / src どっちでもOK
    url: v.url ?? v.src,
    src: v.src ?? v.url,
    poster: v.poster,
    affiliateUrl: v.affUrl ?? v.affiliateUrl,
    affiliateLabel: v.affLabel ?? v.affiliateLabel,
    // 他のフィールドがあってもOK
  } as any;
}

export default function VideoFeed() {
  const [items, setItems] = useState<VideoMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 取得
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const r = await fetch("/api/videos", { cache: "no-store" });
        const data = (await r.json()) as ApiRes;

        if (!alive) return;

        if (!("ok" in data) || data.ok !== true) {
          setErr((data as any)?.error ?? "API error");
          setItems([]);
          setActiveId(null);
          return;
        }

        const normalized = (data.items ?? []).map(normalizeVideo);
        setItems(normalized);
        setActiveId(normalized[0]?.id ?? null);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "fetch failed");
        setItems([]);
        setActiveId(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Scroll Snap + IntersectionObserver で「今見えてる動画」を判定（iPhone最強）
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    if (!items.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        // 一番見えてるやつを active に
        let best: { id: string; ratio: number } | null = null;

        for (const ent of entries) {
          if (!ent.isIntersecting) continue;
          const id = (ent.target as HTMLElement).dataset["id"];
          if (!id) continue;
          const ratio = ent.intersectionRatio;

          if (!best || ratio > best.ratio) best = { id, ratio };
        }

        if (best?.id) setActiveId(best.id);
      },
      {
        root,
        threshold: [0.55, 0.7, 0.85], // だいたい画面の半分以上見えたら切り替え
      }
    );

    sectionRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [items]);

  const activeIndex = useMemo(() => {
    if (!activeId) return 0;
    const i = items.findIndex((x) => x.id === activeId);
    return i >= 0 ? i : 0;
  }, [items, activeId]);

  const scrollToIndex = (idx: number) => {
    const root = scrollerRef.current;
    const el = sectionRefs.current[idx];
    if (!root || !el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // PC用：矢印キーでも移動できる（iPhoneには影響なし）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!items.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        scrollToIndex(Math.min(items.length - 1, activeIndex + 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        scrollToIndex(Math.max(0, activeIndex - 1));
      }
    };
    window.addEventListener("keydown", onKey, { passive: false });
    return () => window.removeEventListener("keydown", onKey as any);
  }, [items.length, activeIndex]);

  return (
    <div className="w-full h-[100svh] overflow-hidden bg-black">
      {/* これが「ページじゃなく、この箱だけが縦にスクロール」する本体 */}
      <div
        ref={scrollerRef}
        className="
          h-[100svh]
          w-full
          overflow-y-scroll
          snap-y snap-mandatory
          overscroll-none
          [-webkit-overflow-scrolling:touch]
        "
      >
        {loading ? (
          <div className="h-[100svh] snap-start flex items-center justify-center text-white/80">
            Loading...
          </div>
        ) : err ? (
          <div className="h-[100svh] snap-start flex flex-col items-center justify-center gap-3 text-white/80">
            <div>読み込みエラー</div>
            <div className="text-xs text-white/50">{err}</div>
            <button
              className="px-4 py-2 rounded bg-white text-black"
              onClick={() => location.reload()}
            >
              リロード
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="h-[100svh] snap-start flex items-center justify-center text-white/80">
            動画がありません（/admin で追加してね）
          </div>
        ) : (
          items.map((v, i) => (
            <div
              key={v.id}
              data-id={v.id}
              ref={(el) => {
                sectionRefs.current[i] = el;
              }}
              className="h-[100svh] w-full snap-start"
            >
              {/* 1画面にピッタリ固定 */}
              <div className="h-[100svh] w-full">
                <VideoPlayer video={v} isActive={v.id === activeId} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
