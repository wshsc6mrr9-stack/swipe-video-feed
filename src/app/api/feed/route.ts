import { NextResponse } from "next/server";
import { getFilteredVideos } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // ===== genre / genres 両対応（日本語URL完全対応）=====
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

    const genres = rawGenres
      .split(",")
      .map(s => safeDecode(s.trim()))
      .filter(Boolean);

    // ★ 超重要：空配列は undefined にする
    const genresArg = genres.length > 0 ? genres : undefined;

    // ===== その他クエリ =====
    const query = searchParams.get("query") || "";

    const count = Number(searchParams.get("count") ?? "50");
    const page  = Number(searchParams.get("page")  ?? "1");
    const seed  = Number(searchParams.get("seed")  ?? "0");

    const idsParam = searchParams.get("ids") || "";
    const targetIds = idsParam
      ? idsParam.split(",").map(s => s.trim()).filter(Boolean)
      : undefined;

    // ===== 取得 =====
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