"use client";

import dynamic from "next/dynamic";
import type { GenreKey } from "@/lib/genres";

const VideoFeed = dynamic(() => import("@/components/VideoFeed"), { ssr: false });

type Props = {
  initialGenre?: string; // デコード前を想定して string で受け取ります
  hideGenreMenu?: boolean;

  // ✅ /video/[id] から渡す
  startId?: string;
};

export default function VideoFeedNoSSR({ initialGenre, hideGenreMenu, startId }: Props) {
  // 🚀 修正ポイント：URLの「%E3%82...」を「ギャル」などの日本語にデコードする
  let decodedGenre: string | undefined = undefined;
  
  if (initialGenre) {
    try {
      // ブラウザが自動でかけたエンコードを解除して、DBのタグと同じ日本語に戻す
      decodedGenre = decodeURIComponent(initialGenre);
    } catch (e) {
      // 万が一エラーになった場合はそのままの値を採用
      decodedGenre = initialGenre;
    }
  }

  return (
    <VideoFeed
      initialGenre={decodedGenre as GenreKey}
      hideGenreMenu={hideGenreMenu}
      startId={startId}
    />
  );
}