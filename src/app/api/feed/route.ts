import { NextResponse } from "next/server";
import { getFilteredVideos } from "@/lib/redis";
import { GENRE_MAP } from "@/lib/genreMap";

export const dynamic = "force-dynamic";

function toSafeNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const rawGenres = searchParams.get("genres") ?? searchParams.get("genre") ?? "";
    const genres = rawGenres
      .split(",")
      .map((s) => {
        try {
          return decodeURIComponent(s.trim());
        } catch {
          return s.trim();
        }
      })
      .filter(Boolean);

    const mappedGenres = Array.from(
      new Set(
        genres.flatMap((g) => {
          if (g.startsWith("__")) return [g];
          return GENRE_MAP[g] ?? [];
        })
      )
    );

    const query = searchParams.get("query") || "";
    // 不正な値の防止と安全な数値変換
    const count = Math.min(Number.parseInt(searchParams.get("count") || "20", 10), 100);
    const page = Math.max(Number.parseInt(searchParams.get("page") || "1", 10), 1);
    const seed = Number.parseInt(searchParams.get("seed") || "0", 10) || 0;

    const idsParam = searchParams.get("ids");
    const targetIds = idsParam ? idsParam.split(",").map((s) => s.trim()).filter(Boolean) : undefined;

    // ★ 修正ポイント：過去の強引なスライス処理を廃止。
    // redis.ts に元々ある完璧なページネーション機能にすべてを委譲し、計算ズレを撲滅。
    const fetched = await getFilteredVideos(
      mappedGenres.length > 0 ? mappedGenres : undefined,
      query,
      count,
      page,
      seed,
      targetIds
    );

    const videos = Array.isArray(fetched) ? fetched : [];

    const normalized = videos.map((v: any) => ({
      ...v,
      id: String(v?.id ?? ""),
      title: String(v?.title ?? ""),
      url: v?.url ?? v?.src ?? "",
      src: v?.src ?? v?.url ?? "",
      poster: v?.poster ?? "",
      srcType: v?.srcType ?? undefined,
      affUrl: v?.affUrl ?? v?.affiliateUrl ?? "",
      affLabel: v?.affLabel ?? v?.affiliateLabel ?? "",
      affiliateUrl: v?.affiliateUrl ?? v?.affUrl ?? "",
      affiliateLabel: v?.affiliateLabel ?? v?.affLabel ?? "",
      genres: Array.isArray(v?.genres) ? v.genres : [],
      genre: typeof v?.genre === "string" ? v.genre : "",
      likeCount: Number(v?.likeCount ?? 0),
      duration:
        toSafeNumber(v?.duration) ??
        toSafeNumber(v?.videoDuration) ??
        toSafeNumber(v?.totalDuration) ??
        toSafeNumber(v?.lengthSec) ??
        toSafeNumber(v?.durationSec) ??
        undefined,
    }));

    return NextResponse.json(normalized, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json([], {
      status: 500,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  }
}