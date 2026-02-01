// src/app/video/[id]/page.tsx
import AgeGateGuard from "@/components/AgeGateGuard";
import VideoPageClient from "./video-page-client";
import type { Metadata } from "next";

type ParamsPromise = Promise<{ id?: string }>;

type VideoItem = {
  id: string;
  title?: string;
  poster?: string;
  // 他にもあるけどOGには不要
};

function toAbsUrl(maybeUrl: string, siteUrl: string) {
  try {
    // すでに絶対URLならそのまま
    if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl;
    // 相対なら siteUrl をベースに絶対化
    return new URL(maybeUrl, siteUrl).toString();
  } catch {
    return "";
  }
}

async function fetchVideoById(siteUrl: string, id: string): Promise<VideoItem | null> {
  try {
    const res = await fetch(`${siteUrl}/api/videos`, {
      // OG用途は毎回最新でOK（キャッシュで変になりがち）
      cache: "no-store",
    });
    if (!res.ok) return null;

    const list = (await res.json()) as VideoItem[];
    const v = list?.find((x) => String(x?.id) === id);
    return v ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: ParamsPromise;
}): Promise<Metadata> {
  const p = await params;
  const id = String(p?.id ?? "").trim();

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://swipe-video-feed.vercel.app").trim();
  const url = `${siteUrl}/video/${encodeURIComponent(id)}`;

  // ✅ デフォルト（固定OG画像）
  const fallbackOg = `${siteUrl}/opengraph-image.png`;
  const fallbackTw = `${siteUrl}/twitter-image.png`;

  let ogImage = fallbackOg;
  let twImage = fallbackTw;

  if (id) {
    const v = await fetchVideoById(siteUrl, id);
    const poster = (v?.poster || "").trim();
    const absPoster = poster ? toAbsUrl(poster, siteUrl) : "";

    if (absPoster) {
      // ✅ 動画ごとのサムネ（poster）があればそれを使う
      ogImage = absPoster;
      twImage = absPoster;
    }
  }

  const title = id ? `Video ${id} | Swipe Video Feed` : "Swipe Video Feed";

  return {
    title,
    alternates: { canonical: url },

    openGraph: {
      title,
      url,
      siteName: "Swipe Video Feed",
      type: "video.other",
      images: [
        {
          // ✅ ここが最重要：Xは絶対URL推奨
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title,
      images: [twImage], // ✅ 絶対URL
    },
  };
}

export default async function Page({
  params,
}: {
  params: ParamsPromise;
}) {
  // ✅ paramsをawaitしてPromiseエラー回避
  await params;

  return (
    <AgeGateGuard>
      <VideoPageClient />
    </AgeGateGuard>
  );
}
