"use client";

import dynamic from "next/dynamic";

// VideoFeed を「クライアントでだけ」描画する（SSRしない）
const VideoFeed = dynamic(() => import("@/components/VideoFeed"), {
  ssr: false,
  // ちらつき防止：真っ黒の土台だけ出す（UIは変えない）
  loading: () => <div className="min-h-screen bg-black" />,
});

export default function VideoFeedNoSSR() {
  return <VideoFeed />;
}
