import { Metadata } from "next";
import { notFound } from "next/navigation";
import VideoFeed from "@/components/VideoFeed";
import { GENRE_SEO_MAP } from "@/lib/genres";

type Props = {
  params: { slug: string };
};

// SEOメタデータを生成
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decodeURIComponent(params.slug);
  const info = GENRE_SEO_MAP[slug];

  if (!info) return { title: "ジャンル未設定" };

  return {
    title: `${info.label}の縦型ショート動画まとめ | Swipe Video Feed`,
    description: info.desc,
  };
}

// ジャンル別ページ本体
export default function GenrePage({ params }: Props) {
  const slug = decodeURIComponent(params.slug);
  const info = GENRE_SEO_MAP[slug];

  if (!info) {
    notFound();
  }

  return (
    <main className="w-full h-full bg-black">
      {/* 以前作成したVideoFeedコンポーネントをそのまま使用 */}
      <VideoFeed initialGenre={info.key} />
    </main>
  );
}

// 静的パスの生成（SEOに重要）
export async function generateStaticParams() {
  return Object.keys(GENRE_SEO_MAP).map((slug) => ({
    slug: encodeURIComponent(slug),
  }));
}