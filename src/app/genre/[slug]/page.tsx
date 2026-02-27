import { Metadata } from "next";
import { notFound } from "next/navigation";
// インポート先を相対パスに修正してエラーを回避
import VideoFeed from "../../../components/VideoFeed";
import { GENRE_SEO_MAP } from "../../../lib/genres";

type Props = {
  params: { slug: string };
};

// URL（スラグ）から情報を取得する共通関数
function getGenreInfo(slug: string) {
  try {
    // ブラウザから送られてくるURL形式（%..）を日本語に戻す
    const decodedSlug = decodeURIComponent(slug);
    return GENRE_SEO_MAP[decodedSlug] || null;
  } catch {
    return null;
  }
}

// --- SEOメタデータを生成 ---
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const info = getGenreInfo(params.slug);

  if (!info) return { title: "ジャンルが見つかりません" };

  return {
    title: `${info.label}の縦型ショート動画まとめ | Swipe Video Feed`,
    description: info.desc,
  };
}

// --- ページ本体 ---
export default function GenrePage({ params }: Props) {
  const info = getGenreInfo(params.slug);

  if (!info) {
    notFound();
  }

  return (
    <main className="w-full h-full bg-black">
      {/* 動画フィードを表示。日本語キーをそのまま渡す */}
      <VideoFeed initialGenre={info.key} />
    </main>
  );
}

// --- 重要：全URLの静的生成。日本語URLをVercelに教える ---
export async function generateStaticParams() {
  return Object.keys(GENRE_SEO_MAP).map((slug) => ({
    slug: slug, // decodeせずにそのままキーを渡す
  }));
}