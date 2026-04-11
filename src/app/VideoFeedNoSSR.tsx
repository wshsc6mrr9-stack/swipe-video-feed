// src/app/VideoFeedNoSSR.tsx
"use client";

import dynamic from "next/dynamic";
import type { GenreKey } from "@/lib/genres";

const VideoFeed = dynamic(() => import("@/components/VideoFeed"), { ssr: false });

type Props = {
  initialGenre?: GenreKey;
  hideGenreMenu?: boolean;
  startId?: string;
  initialVideos?: any[];
  initialSeed?: number;
};

export default function VideoFeedNoSSR({ initialGenre, hideGenreMenu, startId, initialVideos, initialSeed }: Props) {
  return (
    <VideoFeed
      initialGenre={initialGenre}
      hideGenreMenu={hideGenreMenu}
      startId={startId}
      initialVideos={initialVideos}
      initialSeed={initialSeed}
    />
  );
}
