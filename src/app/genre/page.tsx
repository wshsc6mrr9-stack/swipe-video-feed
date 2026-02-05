import type { Metadata } from "next";
import Link from "next/link";
import { GENRE_GROUPS } from "@/lib/genres";

export const metadata: Metadata = {
  title: "ジャンル一覧｜アダルトショート動画",
  description:
    "アダルトショート動画をジャンル別に一覧表示。縦スワイプで見やすい短尺動画をスマホでサクサク視聴できます。",
  alternates: { canonical: "/genre" },
};

type GenreItemLike = {
  key?: string;
  slug?: string;
  label?: string;
  name?: string;
};

type GroupLike = {
  label?: string;
  title?: string;
  name?: string;
  items?: GenreItemLike[];
};

function toEntries(x: unknown): Array<[string, GroupLike]> {
  const v: any = x;

  if (Array.isArray(v)) {
    return v.map((g, i) => [String(i), g as GroupLike]);
  }
  if (v && typeof v === "object") {
    return Object.entries(v as Record<string, GroupLike>);
  }
  return [];
}

export default function GenreIndexPage() {
  const entries = toEntries(GENRE_GROUPS);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-sm leading-relaxed">
      <h1 className="mb-4 text-2xl font-bold">ジャンル一覧（アダルトショート動画）</h1>

      <p className="mb-8">
        アダルトショート動画をジャンル別にまとめています。縦スワイプで見やすい短尺動画を、好みのジャンルから探せます。
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {entries.map(([groupKey, group]) => {
          const title = group?.label ?? group?.title ?? group?.name ?? groupKey;
          const items = Array.isArray(group?.items) ? group.items : [];

          return (
            <section key={groupKey} className="rounded border border-white/10 p-4">
              <h2 className="mb-2 font-semibold">{title}</h2>

              <ul className="space-y-1">
                {items.map((g, idx) => {
                  const slug = (g.key ?? g.slug ?? "").toString().trim();

                  // ✅ ここが修正点：?? と || を混ぜるのでカッコ必須
                  const name = (((g.label ?? g.name ?? slug) || `genre-${idx}`))
                    .toString()
                    .trim();

                  if (!slug) return null;

                  return (
                    <li key={`${slug}-${idx}`}>
                      <Link href={`/genre/${slug}`} className="hover:underline">
                        {name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="mt-10">
        <Link href="/" className="rounded bg-white/10 px-4 py-2 hover:bg-white/20">
          トップに戻る
        </Link>
      </div>
    </main>
  );
}
