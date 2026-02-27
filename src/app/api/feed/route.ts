// src/app/api/feed/route.ts
import { NextResponse } from "next/server";
import { getFilteredVideos } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // 1. パラメータの取得と整理
    const genresParam = searchParams.get("genres") || "";
    const query = searchParams.get("query") || "";
    const idsParam = searchParams.get("ids") || "";
    
    // 数値型は安全に変換（NaN対策）
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "10", 10)); // デフォルト10件
    const seed = parseInt(searchParams.get("seed") || "0", 10);

    // 配列化（空文字を除去）
    const genres = genresParam.split(",").map(s => s.trim()).filter(Boolean);
    const targetIds = idsParam.split(",").map(s => s.trim()).filter(Boolean);

    // 2. 検索実行（引数の順番を redis.ts と完全に合わせる）
    // 順番: genres, query, page, limit, seed, targetIds
    const videos = await getFilteredVideos(
      genres,
      query,
      page,
      limit, // ここが重要！以前はここがズレていた可能性があります
      seed,
      targetIds.length > 0 ? targetIds : undefined
    );

    return NextResponse.json(videos);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}