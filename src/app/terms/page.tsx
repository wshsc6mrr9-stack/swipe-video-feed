import Link from "next/link";

export const metadata = { title: "Terms | Swipe Video Feed" };

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-4">
        <Link href="/" className="text-sm text-white/80 hover:text-white">← 動画に戻る</Link>
        <h1 className="text-2xl font-bold">Terms</h1>
        <ul className="list-disc pl-5 text-white/80 space-y-2">
          <li>当サイトは予告なく内容の変更・停止を行う場合があります。</li>
          <li>外部リンク先の内容について当サイトは責任を負いません。</li>
          <li>禁止事項：法令違反、迷惑行為、不正アクセス、過度な負荷をかける行為等。</li>
        </ul>
        <Link href="/info" className="underline">まとめ（/info）を見る</Link>
      </div>
    </main>
  );
}
