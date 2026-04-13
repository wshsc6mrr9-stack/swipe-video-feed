"use client";

import React, { useMemo, useEffect, useRef } from "react";
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
  likeCount?: number;
  genres?: string[];
  genre?: string;
};

type Props = {
  video: VideoItem;
  isActive: boolean;
  isNeighbor?: boolean;
  onNext?: () => void;
  onPrev?: () => void;
};

export default function VideoCard({
  video,
  isActive,
  isNeighbor = false,
}: Props) {
  const src = (video.url ?? video.src ?? "") as string;

  const affUrl = (video.affUrl ?? video.affiliateUrl ?? "")?.trim() || undefined;
  const affLabel =
    (video.affLabel ?? video.affiliateLabel ?? "商品を見る")?.trim() || "商品を見る";

  const trackSentRef = useRef(false);

  const trackAction = async (type: "play") => {
    if (!video.id) return; // IDが空なら送らない
    try {
      const res = await fetch("/api/stats/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: String(video.id).trim(), type }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.warn("[track] failed:", res.status, body);
      }
    } catch (e) {
      console.error("[track] fetch error:", e);
    }
  };

  useEffect(() => {
    if (isActive && !trackSentRef.current) {
      trackAction("play");
      trackSentRef.current = true;
    }
    if (!isActive) {
      trackSentRef.current = false;
    }
  }, [isActive, video.id]);

  const playerVideo = useMemo(() => {
    return {
      ...video,
      url: src,
      src,
      affUrl,
      affLabel,
      poster: video.poster,
    };
  }, [video, src, affUrl, affLabel]);

  return (
    <div
      className="relative w-full bg-black overflow-hidden"
      style={{
        height: "100svh",
      }}
    >
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
          video={playerVideo as any}
          isActive={isActive}
          isNeighbor={isNeighbor}
        />
      </div>
    </div>
  );
}