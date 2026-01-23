import Link from "next/link";

export const metadata = { title: "About | Swipe Video Feed" };

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-4">
        <Link href="/" className="text-sm text-white/80 hover:text-white">← 動画に戻る</Link>
        <h1 className="text-2xl font-bold">About</h1>
        <p className="text-white/80 leading-relaxed">
          縦スワイプでショート動画を連続視聴できるサイトです。再生/停止、ミュート、シーク、スキップ操作、必要に応じてアフィリンク表示ができます。
        </p>
        <Link href="/info" className="underline">まとめ（/info）を見る</Link>
      </div>
    </main>
  );
}
