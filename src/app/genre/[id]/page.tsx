// src/app/genre/[id]/page.tsx
import type { Metadata } from "next";
// ★ 修正: インポート先を修正し、中身のコンポーネントを正しく呼び出す
import VideoFeedNoSSR from "@/app/VideoFeedNoSSR";
import { GENRE_SEO_MAP, type GenreKey } from "@/lib/genres";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://swipe-video-feed.vercel.app";

type ParamsPromise = Promise<{ id: string }>;

export async function generateMetadata({
  params,
}: {
  params: ParamsPromise;
}): Promise<Metadata> {
  const p = await params;
  const genreId = p.id; 

  const seo = GENRE_SEO_MAP[genreId as GenreKey];
  const pageTitle = seo?.label || `${genreId} 動画一覧`;
  const desc = seo?.desc || `人気ジャンル ${genreId} のショート動画をスワイプで見放題！`;

  const title = `${pageTitle} | Swipe Video Feed`;
  const url = `${SITE_URL}/genre/${genreId}`;

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
          url: `${SITE_URL}/opengraph-image.png`,
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

export default async function GenrePage({
  params,
}: {
  params: ParamsPromise;
}) {
  const p = await params;
  const genreId = p.id;

  // ★ 修正: 画面全体を覆うようにレイアウトを調整して、VideoFeedを呼び出す
  return (
    <main style={{ width: '100vw', height: '100dvh', background: '#000' }}>
       {/* @ts-ignore */}
       <VideoFeedNoSSR initialGenre={genreId} />
    </main>
  );
}