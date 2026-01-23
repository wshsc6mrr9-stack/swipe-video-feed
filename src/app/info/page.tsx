import Link from "next/link";

export const metadata = {
  title: "Info | Swipe Video Feed",
};

export default function InfoPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-black/70 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-sm text-white/80 hover:text-white">
            ← 動画に戻る
          </Link>
          <div className="text-sm font-semibold">Info</div>
          <div className="w-16" />
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6 space-y-10">
        <section className="space-y-3">
          <h1 className="text-xl font-bold">このサイトについて</h1>
          <p className="text-white/80 leading-relaxed">
            縦スワイプでショート動画を連続視聴できるサイトです。右上の「…」から各ページへ移動できます。
          </p>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Link className="rounded-xl bg-white/10 px-3 py-3 text-sm hover:bg-white/15" href="/about">About</Link>
            <Link className="rounded-xl bg-white/10 px-3 py-3 text-sm hover:bg-white/15" href="/privacy">Privacy</Link>
            <Link className="rounded-xl bg-white/10 px-3 py-3 text-sm hover:bg-white/15" href="/terms">Terms</Link>
            <Link className="rounded-xl bg-white/10 px-3 py-3 text-sm hover:bg-white/15" href="/contact">Contact</Link>
          </div>
        </section>

        <section id="about" className="space-y-2">
          <h2 className="text-lg font-semibold">About（サイト説明）</h2>
          <p className="text-white/80 leading-relaxed">
            想定ユーザー：短時間でサクッと動画を見たい人。できること：縦スワイプで切替、再生/停止、ミュート、シーク、アフィリンク表示。
          </p>
        </section>

        <section id="privacy" className="space-y-2">
          <h2 className="text-lg font-semibold">Privacy（プライバシーポリシー）</h2>
          <p className="text-white/80 leading-relaxed">
            当サイトはアクセス解析や広告表示のためにCookie等を利用する場合があります。収集する情報・利用目的・第三者提供・問い合わせ先等は運用に合わせて追記してください。
          </p>
        </section>

        <section id="terms" className="space-y-2">
          <h2 className="text-lg font-semibold">Terms（利用規約）</h2>
          <p className="text-white/80 leading-relaxed">
            当サイトの内容は予告なく変更・停止する場合があります。外部リンク先の内容について当サイトは責任を負いません。禁止事項：法令違反、迷惑行為、過度な負荷等。
          </p>
        </section>

        <section id="contact" className="space-y-2">
          <h2 className="text-lg font-semibold">Contact（連絡先）</h2>
          <p className="text-white/80 leading-relaxed">
            連絡は以下からお願いします（後でフォームにもできます）。
          </p>
          <ul className="list-disc pl-5 text-white/80 space-y-1">
            <li>
              X（例）:{" "}
              <a className="underline" href="https://x.com/" target="_blank" rel="noreferrer">
                https://x.com/（あなたのアカウントに変える）
              </a>
            </li>
            <li>メール（例）: you@example.com（必要なら mailto にします）</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
