import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Swipe Video Feed",
  description: "プライバシーポリシー",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-black text-white px-5 py-8">
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">プライバシーポリシー</h1>

        <section className="space-y-4 text-white/80 leading-relaxed text-sm">
          <p>
            当サイトは、サイト改善・不正防止・利便性向上のためにアクセス情報（閲覧したページ、端末情報、IPアドレス等）を収集する場合があります。
          </p>
          <p>
            広告・アフィリエイトリンクを含む場合があり、リンク先での個人情報の取り扱いは各サービスのポリシーをご確認ください。
          </p>
          <p>
            お問い合わせで取得した情報は、返信対応の目的でのみ利用し、目的外利用は行いません。
          </p>
        </section>

        <Link href="/info" className="text-sm text-white/70 underline">
          ← サイト情報に戻る
        </Link>
      </div>
    </main>
  );
}
