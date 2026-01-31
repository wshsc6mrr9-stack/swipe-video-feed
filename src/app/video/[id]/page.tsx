// src/app/video/[id]/page.tsx
import type { Metadata } from "next";
import { listVideos } from "@/lib/videosStore";

export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const id = params.id;

  // videosStoreに getById が無いので、まずは list から探す（件数少ないなら十分）
  const items = await listVideos();
  const v = items.find((x) => x.id === id);

  const title = v?.title ?? "Swipe Video Feed";
  const pageUrl = `https://swipe-video-feed.vercel.app/video/${id}`;

  // ✅ ここが最重要：Xに出す画像
  // poster が無い場合の保険（適当にデフォ画像を用意しておくと安心）
  const image =
    (v?.poster && v.poster.startsWith("http") ? v.poster : undefined) ??
    "https://swipe-video-feed.vercel.app/og-default.png";

  return {
    title,
    description: "縦スワイプでショート動画を連続視聴",
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description: "縦スワイプでショート動画を連続視聴",
      url: pageUrl,
      type: "website",
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: "縦スワイプでショート動画を連続視聴",
      images: [image],
    },
  };
}

export default async function VideoSharePage() {
  // 共有カード用のページなので、最初は表示なしでもOK
  // （表示まで作りたいなら後でプレイヤーに繋ぐ）
  return null;
}
