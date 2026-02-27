import { Metadata } from "next";
import { notFound } from "next/navigation";
import VideoFeed from "@/components/VideoFeed";
import { GENRE_SEO_MAP, genreLabel } from "@/lib/genres";

type Props = {
  params: { slug: string };
};

// --- SEOメタデータを自動生成 ---
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decodeURIComponent(params.slug);
  const info = GENRE_SEO_MAP[slug];

  if (!info) return {};

  return {
    title: `${info.label}の縦型ショート動画まとめ | Swipe Video Feed`,
    description: info.desc,
    openGraph: {
      title: `${info.label}の動画一覧`,
      description: info.desc,
    },
  };
}

// --- ページ本体 ---
export default function GenrePage({ params }: Props) {
  const slug = decodeURIComponent(params.slug);
  const info = GENRE_SEO_MAP[slug];

  // 存在しないジャンルの場合は404エラーを出す
  if (!info) {
    notFound();
  }

  return (
    <main className="w-full h-full bg-black">
      {/* initialGenre にジャンル名を渡すことで、
         そのURLにアクセスした瞬間にそのジャンルが選択された状態になります 
      */}
      <VideoFeed initialGenre={info.key} />
    </main>
  );
}

// --- 全ジャンル分のURLを事前に生成（爆速化 & SEO） ---
export async function generateStaticParams() {
  return Object.keys(GENRE_SEO_MAP).map((slug) => ({
    slug: encodeURIComponent(slug),
  }));
}