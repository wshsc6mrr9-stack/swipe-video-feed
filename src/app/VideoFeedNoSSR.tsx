// src/app/VideoFeedNoSSR.tsx
"use client";

import dynamic from "next/dynamic";
import type { GenreKey } from "@/lib/genres";

const VideoFeed = dynamic(() => import("@/components/VideoFeed"), { ssr: false });

type Props = {
  initialGenre?: GenreKey;
  hideGenreMenu?: boolean;

  // ✅ /video/[id] から渡す
  startId?: string;
};

export default function VideoFeedNoSSR({ initialGenre, hideGenreMenu, startId }: Props) {
  return (
    <VideoFeed
      initialGenre={initialGenre}
      hideGenreMenu={hideGenreMenu}
      startId={startId}
    />
  );
}
