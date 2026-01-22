import Link from "next/link";

export const metadata = {
  title: "About | Swipe Video Feed",
  description: "サイト説明・誰向けか・何ができるか",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-black text-white px-5 py-8">
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">About</h1>

        <section className="space-y-3 text-white/80 leading-relaxed">
          <p>
            Swipe Video Feed は、縦スワイプでショート動画を連続視聴できるサイトです。
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>スマホ優先の縦UI（PCでも閲覧OK）</li>
            <li>縦スワイプで次の動画へ</li>
            <li>動画ごとにタイトルやリンク（商品を見る等）を表示</li>
          </ul>
          <p>
            「サクッと動画を見たい」「気になる商品リンクをまとめて見たい」人向けです。
          </p>
        </section>

        <Link href="/info" className="text-sm text-white/70 underline">
          ← サイト情報に戻る
        </Link>
      </div>
    </main>
  );
}
