import { Metadata } from "next";
import { notFound } from "next/navigation";
import VideoFeed from "../../../components/VideoFeed";
import { GENRE_SEO_MAP, SLUG_TO_GENRE, GENRE_SLUGS } from "../../../lib/genres";

// ★ 404を撃退するための最重要設定
export const dynamic = "force-dynamic"; // ビルド時の不完全な生成を無視し、常に最新のURLで描画
export const runtime = "nodejs";       // サーバー側で確実に実行

type Props = {
  params: { slug: string };
};

// URL（seisoなど）を日本語ジャンル名（清楚）に変換する
function getGenreName(slug: string) {
  // マップから英語を日本語に戻す。なければURLをデコード
  return SLUG_TO_GENRE[slug] || decodeURIComponent(slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const genreName = getGenreName(params.slug);
  const info = GENRE_SEO_MAP[genreName];

  if (!info) return { title: "ジャンルが見つかりません" };

  return {
    title: `${info.label}の縦型ショート動画まとめ | Swipe Video Feed`,
    description: info.desc,
  };
}

export default function GenrePage({ params }: Props) {
  const genreName = getGenreName(params.slug);
  const info = GENRE_SEO_MAP[genreName];

  // 日本語名が見つからない、またはSEOマップにない場合は404
  if (!info) notFound();

  return (
    <main className="w-full h-full bg-black">
      {/* 動画フィードを表示。日本語キーをそのまま渡す */}
      <VideoFeed initialGenre={info.key} />
    </main>
  );
}

// 静的生成のヒントをVercelに与える（念のため保持）
export async function generateStaticParams() {
  return Object.values(GENRE_SLUGS).map((slug) => ({
    slug: slug,
  }));
}