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

    const rawGenres =
      searchParams.get("genres") ??
      searchParams.get("genre") ??
      "";

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

    const mappedGenres = genres.flatMap((g) => {
      if (g.startsWith("__")) return [g];
      return GENRE_MAP[g] ?? [];
    });

    const query = searchParams.get("query") || "";
    const count = parseInt(searchParams.get("count") || "10", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const seed = parseInt(searchParams.get("seed") || "0", 10);

    const idsParam = searchParams.get("ids");
    let targetIds: string[] | undefined = undefined;
    if (idsParam) {
      targetIds = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
    }

    const videos = await getFilteredVideos(
      mappedGenres.length > 0 ? mappedGenres : undefined,
      query,
      count,
      page,
      seed,
      targetIds
    );

    const normalized = (Array.isArray(videos) ? videos : []).map((v: any) => ({
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
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30",
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json([], { status: 500 });
  }
}
