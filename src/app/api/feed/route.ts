// src/app/api/feed/route.ts
import { NextResponse } from "next/server";
import { getFilteredVideos } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const genresParam = searchParams.get("genres") || "";
    const query = searchParams.get("query") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10); 
    const seed = parseInt(searchParams.get("seed") || "0", 10);
    const idsParam = searchParams.get("ids") || "";

    const genres = genresParam ? genresParam.split(",").map(s => s.trim()).filter(Boolean) : [];
    const targetIds = idsParam ? idsParam.split(",").map(s => s.trim()).filter(Boolean) : undefined;

    // ★ 修正：redis.ts が求めている引数の順番 (genres, query, count, page, seed, targetIds) に完全に合わせる
    const videos = await getFilteredVideos(
      genres,
      query,
      limit, // 第3引数：count (取得件数)
      page,  // 第4引数：page (ページ番号)
      seed,
      targetIds
    );

    return NextResponse.json(videos);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}