import Link from "next/link";

export const metadata = { title: "Privacy | Swipe Video Feed" };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-4">
        <Link href="/" className="text-sm text-white/80 hover:text-white">← 動画に戻る</Link>
        <h1 className="text-2xl font-bold">Privacy Policy</h1>
        <p className="text-white/80 leading-relaxed">
          当サイトは、アクセス解析や機能提供のためにCookie等を利用する場合があります。
          取得する情報、利用目的、第三者提供、保存期間、ユーザーの選択肢等は運用に合わせて追記してください。
        </p>
        <Link href="/info" className="underline">まとめ（/info）を見る</Link>
      </div>
    </main>
  );
}
