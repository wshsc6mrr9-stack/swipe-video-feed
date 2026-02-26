// src/app/VideoFeedNoSSR.tsx
"use client";

import dynamic from "next/dynamic";
import type { GenreKey } from "@/lib/genres";

const VideoFeed = dynamic(() => import("@/components/VideoFeed"), { ssr: false });

type Props = {
  initialGenre?: string; // 型を string に広げて受け取りやすくします
  hideGenreMenu?: boolean;
  startId?: string;
};

export default function VideoFeedNoSSR({ initialGenre, hideGenreMenu, startId }: Props) {
  // ★ 解決策：URLの「%E3...」を「ギャル」という日本語に復元します
  const decodedGenre = initialGenre ? decodeURIComponent(initialGenre) : undefined;

  return (
    <VideoFeed
      initialGenre={decodedGenre as GenreKey}
      hideGenreMenu={hideGenreMenu}
      startId={startId}
    />
  );
}