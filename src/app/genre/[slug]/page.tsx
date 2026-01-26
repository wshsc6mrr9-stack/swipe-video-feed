// src/app/genre/[slug]/page.tsx
import AgeGateGuard from "@/components/AgeGateGuard";
import VideoFeedNoSSR from "@/app/VideoFeedNoSSR";
import { GENRE_SEO_MAP, type GenreKey } from "@/lib/genres";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props) {
  const slug = String(params.slug ?? "").toLowerCase();
  const meta = GENRE_SEO_MAP[slug];

  if (!meta) {
    return {
      title: "Genre not found",
      description: `slug=${slug}`,
    };
  }

  return {
    title: meta.label,
    description: meta.desc,
  };
}

export default function GenrePage({ params }: Props) {
  const raw = String(params.slug ?? "");
  const slug = raw.toLowerCase();
  const meta = GENRE_SEO_MAP[slug];

  // ✅ 見つからない時：404じゃなく “見える画面” で原因が分かるようにする
  if (!meta) {
    const keys = Object.keys(GENRE_SEO_MAP ?? {}).sort();
    return (
      <main className="min-h-[100svh] bg-black text-white p-6 space-y-4">
        <h1 className="text-2xl font-bold">GENRE_SEO_MAP に slug が無い</h1>

        <div className="text-sm opacity-80 space-y-1">
          <div>
            raw: <b>{raw}</b>
          </div>
          <div>
            normalized: <b>{slug}</b>
          </div>
        </div>

        <div className="text-sm">
          <div className="font-semibold mb-2">存在する key（先頭120個）</div>
          <pre className="whitespace-pre-wrap break-words bg-white/10 p-3 rounded">
            {keys.slice(0, 120).join(", ")}
          </pre>
        </div>

        <p className="text-sm opacity-80">
          もし <b>{slug}</b> が keys に無いなら、GENRE_GROUPS にその key が存在してない。
          keys にあるのに meta が出ない場合は、GENRE_SEO_MAP の生成が壊れてる（null混入など）。
        </p>
      </main>
    );
  }

  return (
    <AgeGateGuard>
      {/* ✅ 最初に必ず動画（ここが最優先） */}
      <div className="h-[100svh] bg-black">
        <VideoFeedNoSSR initialGenre={meta.key as GenreKey} hideGenreMenu />
      </div>

      {/* SEO用テキスト（動画の下） */}
      <main className="max-w-3xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold text-white">{meta.label}</h1>
        <p className="text-sm text-neutral-300 leading-relaxed">{meta.desc}</p>
      </main>
    </AgeGateGuard>
  );
}
