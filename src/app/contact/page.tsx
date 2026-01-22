import Link from "next/link";

export const metadata = {
  title: "Contact | Swipe Video Feed",
  description: "お問い合わせ",
};

export default function ContactPage() {
  // XのURLだけ自分のに差し替えてOK
  const X_URL = "https://x.com/";

  return (
    <main className="min-h-screen bg-black text-white px-5 py-8">
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Contact</h1>

        <section className="space-y-3 text-white/80 text-sm leading-relaxed">
          <p>連絡は以下からお願いします。</p>

          <a
            href={X_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-block rounded-lg border border-white/15 bg-white/5 px-4 py-2 hover:bg-white/10"
          >
            X（Twitter）で連絡する
          </a>

          <div className="text-white/60">
            ※フォームが必要になったら、次に「/api/contact + メール送信（Resend等）」で作れる。
          </div>
        </section>

        <Link href="/info" className="text-sm text-white/70 underline">
          ← サイト情報に戻る
        </Link>
      </div>
    </main>
  );
}
