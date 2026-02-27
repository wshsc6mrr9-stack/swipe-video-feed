import { Metadata } from "next";
import { notFound } from "next/navigation";
import VideoFeed from "../../../components/VideoFeed";
import { GENRE_SEO_MAP, SLUG_TO_GENRE, GENRE_SLUGS } from "../../../lib/genres";

// ★ サーバー側で動的に実行することを強制
export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  
  // スラッグ(restraint)から日本語名(拘束)を取得
  const genreName = SLUG_TO_GENRE[slug];
  // 日本語名を使ってSEO情報を取得
  const info = genreName ? GENRE_SEO_MAP[genreName] : null;

  if (!info) return { title: "404 Not Found" };

  return {
    title: `${info.label}の縦型ショート動画まとめ | Swipe Video Feed`,
    description: info.desc,
  };
}

export default async function GenrePage({ params }: Props) {
  const { slug } = await params;
  
  // スラッグ(restraint)から日本語名(拘束)を取得
  const genreName = SLUG_TO_GENRE[slug];
  // 日本語名を使ってSEO情報を取得
  const info = genreName ? GENRE_SEO_MAP[genreName] : null;

  // infoが見つからない場合は404を表示
  if (!info) {
    notFound();
  }

  return (
    <main className="w-full h-full bg-black">
      <VideoFeed initialGenre={info.key} />
    </main>
  );
}

// ビルド時に有効なスラッグをすべて登録
export async function generateStaticParams() {
  return Object.values(GENRE_SLUGS).map((slug) => ({
    slug: slug,
  }));
}