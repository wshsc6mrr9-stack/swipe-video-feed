import AgeGateGuard from "@/components/AgeGateGuard";
import VideoPageClient from "./video-page-client";
import type { Metadata } from "next";
import { getFilteredVideos } from "@/lib/redis"; // ★ 追加: データベースから動画を取得する関数

type ParamsPromise = Promise<{ id?: string }>;

export async function generateMetadata({
  params,
}: {
  params: ParamsPromise;
}): Promise<Metadata> {
  const p = await params;
  const id = String(p?.id ?? "").trim();

  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://swipe-video-feed.vercel.app"
  ).trim();

  const url = `${siteUrl}/video/${encodeURIComponent(id || "")}`;

  // ▼ デフォルトの設定（もし動画が見つからなかった時の保険）
  let ogImage = `${siteUrl}/opengraph-image.png`;
  let twImage = `${siteUrl}/twitter-image.png`;
  let title = id ? `Video ${id} | Swipe Video Feed` : "Swipe Video Feed";
  let desc = "スワイプでアダルトショート動画を連続視聴。毎日更新の大人向けショート動画サイト。";

  // ▼ ★ ここがSEO最強化のポイント！
  if (id) {
    try {
      // RedisからこのIDの動画データだけを1件取得する
      const videos = await getFilteredVideos([], "", 1, 1, 0, [id]);
      const video = videos[0];

      if (video) {
        // ① 動画のタイトルがあれば、それをページタイトルと説明文にセット
        if (video.title) {
          title = `${video.title} | Swipe Video Feed`;
          desc = `${video.title} - スワイプでサクサク見れるショート動画。`;
        }
        
        // ② 動画のポスター画像（サムネ）があれば、それをシェア用画像にセット
        if (video.poster) {
          ogImage = video.poster;
          twImage = video.poster;
        }
      }
    } catch (e) {
      console.error("SEO Metadata fetch error:", e);
    }
  }

  return {
    title,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: desc,
      url,
      siteName: "Swipe Video Feed",
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      // "summary_large_image" にすることで、X(Twitter)やLINEでデカいサムネ画像付きで表示される！
      card: "summary_large_image", 
      title,
      description: desc,
      images: [twImage],
    },
  };
}

export default async function Page({
  params,
}: {
  params: ParamsPromise;
}) {
  await params;

  return (
    <AgeGateGuard>
      <VideoPageClient />
    </AgeGateGuard>
  );
}