import { NextResponse } from "next/server";
import { getFilteredVideos } from "@/lib/redis";

export const dynamic = "force-dynamic"; // キャッシュを無効化して常に最新データを取得

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    
    // パラメータを正確に取得
    const genresParam = searchParams.get("genres") || "";
    const query = searchParams.get("query") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10); // デフォルト10件
    const seed = parseInt(searchParams.get("seed") || "0", 10);
    const idsParam = searchParams.get("ids") || "";

    // カンマ区切りを配列に変換
    const genres = genresParam ? genresParam.split(",").filter(Boolean) : [];
    const targetIds = idsParam ? idsParam.split(",").filter(Boolean) : undefined;

    // ★ ここが重要：redis.ts の引数の順番と完全に一致させる
    const videos = await getFilteredVideos(
      genres,
      query,
      page,
      limit,
      seed,
      targetIds
    );

    return NextResponse.json(videos);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}