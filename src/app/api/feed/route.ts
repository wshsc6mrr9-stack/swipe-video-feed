import { NextResponse } from "next/server";
import { getFilteredVideos } from "@/lib/redis";

export const dynamic = "force-dynamic";

// ★ 日本語ジャンル → Redisタグ変換
const GENRE_MAP: Record<string, string[]> = {
  "美少女": ["seductress", "exclusive"],
  "主観": ["pov"],
  "VR": ["vr", "vr-only"],
  "ミニ系": ["petite"],
  "パイパン": ["shaved"],
  "清楚": ["innocent"],
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const rawGenres =
      searchParams.get("genres") ??
      searchParams.get("genre") ??
      "";

    const genres = rawGenres
      .split(",")
      .map(s => {
        try {
          return decodeURIComponent(s.trim());
        } catch {
          return s.trim();
        }
      })
      .filter(Boolean);

    // ★ 日本語 → Redis用タグに変換
    const mappedGenres = genres.flatMap(g => GENRE_MAP[g] ?? []);

    const query = searchParams.get("query") || "";
    const count = parseInt(searchParams.get("count") || "50", 10);
    const page  = parseInt(searchParams.get("page")  || "1", 10);
    const seed  = parseInt(searchParams.get("seed")  || "0", 10);

    const videos = await getFilteredVideos(
      mappedGenres.length > 0 ? mappedGenres : undefined,
      query,
      count,
      page,
      seed
    );

    return NextResponse.json(videos);
  } catch (e) {
    console.error(e);
    return NextResponse.json([], { status: 500 });
  }
}