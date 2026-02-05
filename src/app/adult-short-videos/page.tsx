import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "アダルトショート動画｜縦スワイプでサクサク視聴",
  description:
    "スマホで見やすいアダルトショート動画サイト。AVショート動画を縦スワイプで次々視聴。短尺だからサクッと楽しめます。",
  alternates: {
    canonical: "/adult-short-videos",
  },
  openGraph: {
    title: "アダルトショート動画｜縦スワイプでサクサク視聴",
    description:
      "縦スワイプで次々見れるアダルトショート動画。スマホ最適・短尺で快適。",
    url: "/adult-short-videos",
    type: "website",
  },
};

export default function AdultShortVideosPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-sm leading-relaxed">
      <h1 className="mb-4 text-2xl font-bold">
        アダルトショート動画（スマホで見やすい短尺動画）
      </h1>

      <p className="mb-6">
        スマホで片手操作。縦スワイプで次々見れる
        <strong>アダルトショート動画</strong>
        サイトです。AVショート動画を短尺でサクッと視聴できます。
      </p>

      <h2 className="mb-2 text-lg font-semibold">
        縦スワイプで次の動画へ
      </h2>
      <p className="mb-4">
        TikTok風の縦スワイプ操作で、再生停止や戻る操作に迷いません。
        指一本でテンポよく動画を切り替えられます。
      </p>

      <h2 className="mb-2 text-lg font-semibold">
        短尺だからサクッと見れる
      </h2>
      <p className="mb-4">
        1本が短いアダルトショート動画中心。
        スキマ時間でも快適に楽しめます。
      </p>

      <h2 className="mb-2 text-lg font-semibold">
        スマホ最適・全画面表示
      </h2>
      <p className="mb-6">
        縦画面フルサイズで表示されるため、見づらさや操作ストレスがありません。
      </p>

      <div className="mb-8 flex gap-4">
        <Link
          href="/"
          className="rounded bg-white/10 px-4 py-2 hover:bg-white/20"
        >
          今すぐ動画を見る
        </Link>

        {/* ✅ ここだけ修正：/ → /genre */}
        <Link
          href="/genre"
          className="rounded bg-white/10 px-4 py-2 hover:bg-white/20"
        >
          ジャンルから探す
        </Link>
      </div>

      <h2 className="mb-2 text-lg font-semibold">よくある質問</h2>

      <p className="mb-2 font-semibold">
        Q. アダルトショート動画とは？
      </p>
      <p className="mb-4">
        短時間で楽しめるアダルト動画のことです。
        いわゆるエロショート動画と呼ばれることもあります。
      </p>

      <p className="mb-2 font-semibold">Q. 無料で見れますか？</p>
      <p className="mb-4">
        サイト上で視聴できる動画は無料で楽しめます。
      </p>

      <p className="text-xs opacity-70">
        ※ 本サイトは18歳未満の方の利用を禁止しています。
      </p>
    </main>
  );
}
