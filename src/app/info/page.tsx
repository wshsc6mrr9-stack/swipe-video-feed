import Link from "next/link";

export const metadata = {
  title: "Info | Swipe Video Feed",
  description: "サイト情報（About / Privacy / Terms / Contact）",
};

export default function InfoPage() {
  return (
    <main className="min-h-screen bg-black text-white px-5 py-8">
      <div className="max-w-xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold">サイト情報</h1>
          <p className="text-white/70 text-sm">
            このサイトの説明・規約・プライバシー・連絡先をまとめています。
          </p>
        </header>

        <nav className="space-y-3">
          <Link
            href="/about"
            className="block rounded-xl border border-white/15 bg-white/5 px-4 py-3 hover:bg-white/10"
          >
            <div className="font-semibold">/about</div>
            <div className="text-sm text-white/70">サイト説明・誰向けか・何ができるか</div>
          </Link>

          <Link
            href="/privacy"
            className="block rounded-xl border border-white/15 bg-white/5 px-4 py-3 hover:bg-white/10"
          >
            <div className="font-semibold">/privacy</div>
            <div className="text-sm text-white/70">プライバシーポリシー</div>
          </Link>

          <Link
            href="/terms"
            className="block rounded-xl border border-white/15 bg-white/5 px-4 py-3 hover:bg-white/10"
          >
            <div className="font-semibold">/terms</div>
            <div className="text-sm text-white/70">利用規約（簡易）</div>
          </Link>

          <Link
            href="/contact"
            className="block rounded-xl border border-white/15 bg-white/5 px-4 py-3 hover:bg-white/10"
          >
            <div className="font-semibold">/contact</div>
            <div className="text-sm text-white/70">連絡先（Xリンク or フォーム）</div>
          </Link>
        </nav>

        <div className="pt-2">
          <Link href="/" className="text-sm text-white/70 underline">
            ← フィードに戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
