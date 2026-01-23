"use client";

import React from "react";
import VideoPlayer from "@/components/VideoPlayer";

type VideoItem = {
  id: string;
  title: string;
  url?: string;
  src?: string;
  poster?: string;
  srcType?: "mp4" | "hls";
  affUrl?: string;
  affLabel?: string;
  affiliateUrl?: string;
  affiliateLabel?: string;
};

type Props = {
  video: VideoItem;
  isActive: boolean;
};

export default function VideoCard({ video, isActive }: Props) {
  const src = (video.url ?? video.src ?? "") as string;

  // 互換：aff / affiliate を VideoPlayer 側が読む形に合わせる
  const affUrl = (video.affUrl ?? video.affiliateUrl ?? "")?.trim() || undefined;
  const affLabel =
    (video.affLabel ?? video.affiliateLabel ?? "商品を見る")?.trim() || "商品を見る";

  return (
    <div className="relative h-[100svh] w-full bg-black">
      <VideoPlayer
        // VideoPlayer は video.url / video.src どっちでも読むが、両方入れとくと安全
        // @ts-ignore
        video={{ ...video, url: src, src, affUrl, affLabel }}
        isActive={isActive}
      />
    </div>
  );
}
