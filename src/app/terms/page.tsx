import Link from "next/link";

export const metadata = {
  title: "Terms | Swipe Video Feed",
  description: "利用規約（簡易）",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-white px-5 py-8">
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">利用規約（簡易）</h1>

        <section className="space-y-4 text-white/80 leading-relaxed text-sm">
          <p>
            当サイトの利用により生じた損害について、運営者は責任を負いません（法令で認められる範囲）。
          </p>
          <p>
            掲載内容は予告なく変更・削除される場合があります。
          </p>
          <p>
            不正アクセス、迷惑行為、サーバーに過度な負荷をかける行為は禁止します。
          </p>
          <p>
            外部リンク先で提供される商品・サービス等について、当サイトは責任を負いません。
          </p>
        </section>

        <Link href="/info" className="text-sm text-white/70 underline">
          ← サイト情報に戻る
        </Link>
      </div>
    </main>
  );
}
