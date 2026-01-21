"use client";

import React from "react";
import VideoPlayer from "./VideoPlayer";
import type { VideoItem, VideoMeta } from "@@/lib/types";

type Props = {
  video: VideoMeta;
  isActive?: boolean;
};

function guessSrcType(url: string): VideoItem["srcType"] {
  return url.includes(".m3u8") ? "hls" : "mp4";
}

export default function VideoCard({ video, isActive }: Props) {
  // ✅ VideoMeta -> VideoItem に正規化（url を必ず埋める）
  const url = video.url ?? video.src ?? "";

  if (!url) {
    return (
      <div className="relative w-full h-[100svh] bg-black text-white flex items-center justify-center">
        動画URLが空です（adminでURLを入れてください）
      </div>
    );
  }

  const normalized: VideoItem = {
    id: video.id,
    title: video.title,
    url,
    poster: video.poster,
    srcType: video.srcType ?? guessSrcType(url),
    createdAt: video.createdAt ?? Date.now(),
    // 新旧どっちでも拾う
    affUrl: video.affUrl ?? video.affiliateUrl,
    affLabel: video.affLabel ?? video.affiliateLabel
  };

  return (
    <div className="relative w-full h-[100svh] bg-black overflow-hidden">
      <VideoPlayer video={normalized} isActive={isActive} />
    </div>
  );
}
