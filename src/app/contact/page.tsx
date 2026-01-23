import Link from "next/link";

export const metadata = { title: "Contact | Swipe Video Feed" };

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-4">
        <Link href="/" className="text-sm text-white/80 hover:text-white">← 動画に戻る</Link>
        <h1 className="text-2xl font-bold">Contact</h1>

        <p className="text-white/80 leading-relaxed">
          連絡先（まずはリンクでOK。後からフォームにもできます）
        </p>

        <div className="space-y-2 text-white/80">
          <div>
            X:{" "}
            <a className="underline" href="https://x.com/" target="_blank" rel="noreferrer">
              https://x.com/（あなたのアカウントに変える）
            </a>
          </div>
          <div>Mail: you@example.com</div>
        </div>

        <Link href="/info" className="underline">まとめ（/info）を見る</Link>
      </div>
    </main>
  );
}
