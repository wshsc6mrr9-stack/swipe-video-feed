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

  // ---------------------------
  // 🚀 トラッキング（計測）機能
  // ---------------------------
  const trackSentRef = useRef(false);

  const trackAction = async (type: "play" | "click") => {
    try {
      await fetch("/api/stats/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId: video.id, type }),
      });
    } catch (e) {
      console.error("Tracking failed", e);
    }
  };

  // ✅ 動画がアクティブ（表示）になったら「再生数」をカウント
  useEffect(() => {
    if (isActive && !trackSentRef.current) {
      trackAction("play");
      trackSentRef.current = true; // 1回の表示につき1回だけカウント
    }
    if (!isActive) {
      trackSentRef.current = false; // 画面から外れたらリセット（再度戻ってきたらカウント）
    }
  }, [isActive, video.id]);

  // ✅ VideoPlayer に渡すオブジェクトを安定化
  const playerVideo = useMemo(() => {
    return {
      ...video,
      url: src,
      src,
      affUrl,
      affLabel,
      poster: video.poster,
    };
  }, [video.id, video.title, src, affUrl, affLabel, video.poster]);

  return (
    <div
      className="relative w-full bg-black overflow-hidden"
      style={{
        height: "100svh",
      }}
      // ✅ カード全体やリンクがクリックされた時に「アフィ移動」を計測したい場合
      onClick={() => {
        // もしVideoPlayer内のボタンだけでなく、カード操作も計測したい場合はここに追加
        // 今回はボタン側（VideoPlayer内）で制御するのが一般的です
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
          // @ts-ignore
          video={playerVideo}
          isActive={isActive}
          // ✅ VideoPlayer 側でアフィリンクが押された時に実行するコールバック（もし実装があれば）
          // @ts-ignore
          onAffiliateClick={() => trackAction("click")}
        />
      </div>
    </div>
  );
}