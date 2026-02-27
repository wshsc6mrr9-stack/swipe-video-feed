import { Metadata } from "next";
import { notFound } from "next/navigation";
import VideoFeed from "../../../components/VideoFeed";
import { GENRE_SEO_MAP, SLUG_TO_GENRE, GENRE_SLUGS } from "../../../lib/genres";

// ★ サーバー側で動的に実行することを強制
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>; // Next.js 15以降の推奨形式
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const genreName = SLUG_TO_GENRE[slug] || decodeURIComponent(slug);
  const info = GENRE_SEO_MAP[genreName];

  if (!info) return { title: "404 Not Found" };

  return {
    title: `${info.label}の縦型ショート動画まとめ | Swipe Video Feed`,
    description: info.desc,
  };
}

export default async function GenrePage({ params }: Props) {
  const { slug } = await params;
  const genreName = SLUG_TO_GENRE[slug] || decodeURIComponent(slug);
  const info = GENRE_SEO_MAP[genreName];

  if (!info) {
    notFound();
  }

  return (
    <main className="w-full h-full bg-black">
      <VideoFeed initialGenre={info.key} />
    </main>
  );
}

// 念のため、ビルド時にURLを登録しておく
export async function generateStaticParams() {
  return Object.values(GENRE_SLUGS).map((slug) => ({
    slug: slug,
  }));
}