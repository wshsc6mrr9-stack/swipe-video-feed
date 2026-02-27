import { Metadata } from "next";
import { notFound } from "next/navigation";
import VideoFeed from "../../../components/VideoFeed";
import { GENRE_SEO_MAP, SLUG_TO_GENRE, GENRE_SLUGS } from "../../../lib/genres";

type Props = {
  params: { slug: string };
};

// URL（seisoなど）を日本語ジャンル名（清楚）に変換する
function getGenreName(slug: string) {
  // まず英語マップから検索、なければデコードした日本語を試す
  return SLUG_TO_GENRE[slug] || decodeURIComponent(slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const genreName = getGenreName(params.slug);
  const info = GENRE_SEO_MAP[genreName];

  if (!info) return { title: "動画が見つかりません" };

  return {
    title: `${info.label}の縦型ショート動画まとめ | Swipe Video Feed`,
    description: info.desc,
  };
}

export default function GenrePage({ params }: Props) {
  const genreName = getGenreName(params.slug);
  const info = GENRE_SEO_MAP[genreName];

  if (!info) notFound();

  return (
    <main className="w-full h-full bg-black">
      <VideoFeed initialGenre={info.key} />
    </main>
  );
}

export async function generateStaticParams() {
  // 登録した英語スラッグをすべてURLとして事前に書き出す
  return Object.values(GENRE_SLUGS).map((slug) => ({
    slug: slug,
  }));
}