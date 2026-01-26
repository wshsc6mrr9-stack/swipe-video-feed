"use client";

import dynamic from "next/dynamic";
import type { GenreKey } from "@/lib/genres";

const VideoFeed = dynamic(() => import("@/components/VideoFeed"), { ssr: false });

type Props = {
  initialGenre?: GenreKey;
  hideGenreMenu?: boolean;
};

export default function VideoFeedNoSSR({ initialGenre, hideGenreMenu }: Props) {
  return <VideoFeed initialGenre={initialGenre} hideGenreMenu={hideGenreMenu} />;
}
