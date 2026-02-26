// src/app/page.tsx
// 魔法の設定：このページは絶対にキャッシュ（保存）せず、常に最新のデータを取得する！
export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { Metadata } from "next";
import VideoFeedNoSSR from "@/app/VideoFeedNoSSR";

// サイトのベースURL（環境変数がない場合はデフォルト値）
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://swipe-video-feed.vercel.app";

// ★ 追加: メタデータ生成
export async function generateMetadata(): Promise<Metadata> {
  // トップページは固定の最強キーワードで勝負
  const title = "アダルトショート動画 | Swipe Video Feed";
  const desc = "スワイプでアダルトショート動画を連続視聴。毎日更新の大人向けショート動画サイト。";
  const url = SITE_URL;

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
          url: `${SITE_URL}/opengraph-image.png`, // サイト共通のサムネ
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [`${SITE_URL}/twitter-image.png`],
    },
  };
}

type SearchParamsPromise = Promise<Record<string, string | string[] | undefined>>;

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParamsPromise;
}) {
  const sp = await searchParams;

  const v = sp?.v;
  const startId = Array.isArray(v) ? String(v[0] ?? "").trim() : String(v ?? "").trim();

  // トップページなのでジャンル指定はなし (initialGenreは渡さない)
  return <VideoFeedNoSSR startId={startId} />;
}