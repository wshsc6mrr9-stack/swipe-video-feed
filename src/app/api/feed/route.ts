// ===== src/app/api/feed/route.ts =====
import { NextResponse } from "next/server";
import { getFilteredVideos } from "@/lib/redis";
import { GENRE_MAP } from "@/lib/genreMap";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // --- genre / genres 両対応（日本語URL対応） ---
    const rawGenres =
      searchParams.get("genres") ??
      searchParams.get("genre") ??
      "";

    const safeDecode = (s: string) => {
      try {
        return s.includes("%") ? decodeURIComponent(s) : s;
      } catch {
        return s;
      }
    };

    // UIで選ばれた日本語ジャンル
    const uiGenres = rawGenres
      .split(",")
      .map(s => safeDecode(s.trim()))
      .filter(Boolean);

    // ★ 日本語 → 英語（Redis検索用）に変換
    const redisGenres = uiGenres.flatMap(g => GENRE_MAP[g] ?? []);

    // --- その他パラメータ ---
    const query = searchParams.get("query") || "";
    const count = Number(searchParams.get("count") ?? "50");
    const page  = Number(searchParams.get("page")  ?? "1");
    const seed  = Number(searchParams.get("seed")  ?? "0");

    const idsParam = searchParams.get("ids") || "";
    const targetIds = idsParam
      ? idsParam.split(",").map(s => s.trim()).filter(Boolean)
      : undefined;

    // 空配列は undefined（全件扱い）に
    const genresArg = redisGenres.length > 0 ? redisGenres : undefined;

    const videos = await getFilteredVideos(
      genresArg,
      query,
      count,
      page,
      seed,
      targetIds
    );

    return NextResponse.json(videos);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json([], { status: 500 });
  }
}