"use client";

import React from "react";
import type { VideoMeta } from "@/lib/types";
import VideoPlayer from "./VideoPlayer";

type Props = {
  video: VideoMeta;
  isActive: boolean;
};

export default function VideoCard({ video, isActive }: Props) {
  return (
    <div className="relative w-full h-[100svh] h-[100dvh] bg-black overflow-hidden">
      <VideoPlayer video={video} isActive={isActive} />
    </div>
  );
}
