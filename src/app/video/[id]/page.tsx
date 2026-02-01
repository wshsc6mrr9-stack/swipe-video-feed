// src/app/video/[id]/page.tsx
import AgeGateGuard from "@/components/AgeGateGuard";
import VideoPageClient from "./video-page-client";
import type { Metadata } from "next";

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

  // ✅ まずは「全動画共通サムネ」で確実に出す（あとで動画ごとに差し替え可能）
  const ogImage = `${siteUrl}/opengraph-image.png`;
  const twImage = `${siteUrl}/twitter-image.png`;

  const title = id ? `Video ${id} | Swipe Video Feed` : "Swipe Video Feed";
  const desc =
    "スワイプでアダルトショート動画を連続視聴。毎日更新の大人向けショート動画サイト。";

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
          url: ogImage, // ✅ 絶対URL
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [twImage], // ✅ 絶対URL
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
