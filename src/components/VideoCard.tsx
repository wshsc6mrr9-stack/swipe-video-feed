"use client";

import React, { useMemo } from "react";
import VideoPlayer from "./VideoPlayer";

// いまのプロジェクトは VideoMeta / VideoItem が混在しがちなので、
// ここでは「受け取った video を安全に正規化」して使う（型で詰まらないように）
type AnyVideo = any;

type Props = {
  video: AnyVideo;
  isActive?: boolean;
};

function guessSrcType(url: string | undefined): "mp4" | "hls" {
  if (!url) return "mp4";
  return url.includes(".m3u8") ? "hls" : "mp4";
}

function normalizeVideo(v: AnyVideo) {
  const url =
    (typeof v?.url === "string" && v.url.trim()) ||
    (typeof v?.src === "string" && v.src.trim()) ||
    "";

  const poster =
    (typeof v?.poster === "string" && v.poster.trim()) || undefined;

  const affiliateUrl =
    (typeof v?.affiliateUrl === "string" && v.affiliateUrl.trim()) ||
    (typeof v?.affUrl === "string" && v.affUrl.trim()) ||
    undefined;

  const affiliateLabel =
    (typeof v?.affiliateLabel === "string" && v.affiliateLabel.trim()) ||
    (typeof v?.affLabel === "string" && v.affLabel.trim()) ||
    undefined;

  const title =
    (typeof v?.title === "string" && v.title.trim()) || "Untitled";

  const id = (typeof v?.id === "string" && v.id.trim()) || crypto.randomUUID?.() || String(Date.now());

  const srcType =
    (v?.srcType === "hls" || v?.srcType === "mp4")
      ? v.srcType
      : guessSrcType(url);

  return {
    id,
    title,
    url,
    src: url, // 互換（VideoPlayer が src を見てもOKなように）
    poster,
    affiliateUrl,
    affiliateLabel,
    srcType,
    createdAt: typeof v?.createdAt === "number" ? v.createdAt : Date.now(),
  };
}

export default function VideoCard({ video, isActive = false }: Props) {
  const item = useMemo(() => normalizeVideo(video), [video]);

  return (
    <div className="relative w-full h-[100svh] bg-black overflow-hidden">
      <VideoPlayer
        video={item}
        isActive={isActive}
      />

      {/* アフィボタン（スワイプ判定に殺されないように強めに防御） */}
      {item.affiliateUrl ? (
        <a
          data-no-swipe
          href={item.affiliateUrl}
          target="_blank"
          rel="noreferrer"
          className="absolute right-4 bottom-24 z-[9999] pointer-events-auto rounded-full bg-white px-4 py-2 text-sm font-bold text-black shadow"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        >
          {item.affiliateLabel?.trim() ? item.affiliateLabel : "商品を見る"}
        </a>
      ) : null}
    </div>
  );
}
