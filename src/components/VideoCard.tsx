"use client";

import React, { useMemo } from "react";
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

  // ✅ VideoPlayer に渡すオブジェクトを安定化（レンダー毎に無駄な差分を減らす）
  const playerVideo = useMemo(() => {
    return {
      ...video,
      url: src,
      src,
      affUrl,
      affLabel,
      poster: video.poster,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id, video.title, src, affUrl, affLabel, video.poster]);

  return (
    <div
      className="relative w-full bg-black overflow-hidden"
      style={{
        height: "100svh",
      }}
    >
      {/* ✅ safe-area を VideoPlayer 側のUIレイヤーで使えるようにする */}
      <div
        className="absolute inset-0"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingRight: "env(safe-area-inset-right)",
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "env(safe-area-inset-left)",
        }}
      >
        <VideoPlayer
          // @ts-ignore
          video={playerVideo}
          isActive={isActive}
        />
      </div>
    </div>
  );
}
