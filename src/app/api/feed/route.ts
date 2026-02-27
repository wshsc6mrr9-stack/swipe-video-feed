import { NextResponse } from "next/server";
import { getFilteredVideos } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // genre / genres 両対応（日本語URL対応）
    const genresParam =
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

    const genres = genresParam
      .split(",")
      .map(s => safeDecode(s.trim()))
      .filter(Boolean);

    const query = searchParams.get("query") || "";

    // 数値パラメータ
    const count = parseInt(searchParams.get("count") || "50", 10);
    const page  = parseInt(searchParams.get("page")  || "1", 10);
    const seed  = parseInt(searchParams.get("seed")  || "0", 10);

    const idsParam = searchParams.get("ids") || "";
    const targetIds = idsParam
      ? idsParam.split(",").map(s => s.trim()).filter(Boolean)
      : undefined;

    // ★ 空配列は undefined に変換（超重要）
    const genresArg = genres.length > 0 ? genres : undefined;

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