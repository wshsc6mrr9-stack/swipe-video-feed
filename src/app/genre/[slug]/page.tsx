// src/app/genre/[slug]/page.tsx
import AgeGateGuard from "@/components/AgeGateGuard";
import VideoFeedNoSSR from "@/app/VideoFeedNoSSR";
import { GENRE_SEO_MAP, type GenreKey } from "@/lib/genres";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug?: string }> };

function norm(v: unknown) {
  return String(v ?? "").trim().toLowerCase();
}

export async function generateMetadata({ params }: Props) {
  const p = await params;
  const raw = String(p?.slug ?? "");
  const slug = norm(raw);
  const meta = GENRE_SEO_MAP[slug];

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://swipe-video-feed.vercel.app").trim();
  const canonical = `${siteUrl}/genre/${encodeURIComponent(slug)}`;

  // slug自体が空なら /genre 相当なので noindex
  if (!slug) {
    return {
      title: "ジャンル一覧｜アダルトショート動画",
      description: "ジャンル別にアダルトショート動画をまとめています。",
      alternates: { canonical: `${siteUrl}/genre` },
      robots: { index: false, follow: true },
    };
  }

  // 見つからないslugも noindex（迷子防止）
  if (!meta) {
    return {
      title: "Genre not found",
      description: `slug=${slug}`,
      alternates: { canonical },
      robots: { index: false, follow: false },
    };
  }

  return {
    title: meta.label,
    description: meta.desc,
    alternates: { canonical },
    openGraph: {
      title: meta.label,
      description: meta.desc,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: meta.label,
      description: meta.desc,
    },
  };
}

export default async function GenrePage({ params }: Props) {
  const p = await params;
  const raw = String(p?.slug ?? "");
  const slug = norm(raw);

  // slugが空なら「/genre/」扱いなので404にする（変なURL対策）
  if (!slug) notFound();

  const meta = GENRE_SEO_MAP[slug];

  // 本番は迷子slugを404（SEO的に正解）
  if (!meta) {
    if (process.env.NODE_ENV === "production") notFound();

    // 開発だけデバッグ画面（原因追える）
    const keys = Object.keys(GENRE_SEO_MAP ?? {}).sort();
    return (
      <main className="min-h-[100svh] bg-black text-white p-6 space-y-4">
        <h1 className="text-2xl font-bold">GENRE_SEO_MAP に slug が無い</h1>
        <div className="text-sm opacity-80 space-y-1">
          <div>
            raw: <b>{raw || "(empty)"}</b>
          </div>
          <div>
            normalized: <b>{slug || "(empty)"}</b>
          </div>
        </div>

        <div className="text-sm">
          <div className="font-semibold mb-2">存在する key（先頭120個）</div>
          <pre className="whitespace-pre-wrap break-words bg-white/10 p-3 rounded">
            {keys.slice(0, 120).join(", ")}
          </pre>
        </div>
      </main>
    );
  }

  return (
    <AgeGateGuard>
      <div className="h-[100svh] bg-black">
        <VideoFeedNoSSR initialGenre={meta.key as GenreKey} hideGenreMenu />
      </div>

      <main className="max-w-3xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold text-white">{meta.label}</h1>
        <p className="text-sm text-neutral-300 leading-relaxed">{meta.desc}</p>
      </main>
    </AgeGateGuard>
  );
}
