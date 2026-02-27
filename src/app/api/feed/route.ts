import { NextResponse } from "next/server";
import { getFilteredVideos } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // 送られてきた文字を確実に日本語として受け取る
    const genresParam = searchParams.get("genres") || "";
    const genres = genresParam
      .split(",")
      .map(s => {
        try { return decodeURIComponent(s.trim()); } catch { return s.trim(); }
      })
      .filter(Boolean);

    const query = searchParams.get("query") || "";
    
    // パラメータを数値化（デフォルト値もオリジナルに合わせる）
    const count = parseInt(searchParams.get("count") || "50", 10);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const seed = parseInt(searchParams.get("seed") || "0", 10);
    
    const idsParam = searchParams.get("ids") || "";
    const targetIds = idsParam ? idsParam.split(",").map(s => s.trim()).filter(Boolean) : undefined;

    // ★ 引数の順番をオリジナル(genres, query, count, page...)に完全一致させる
    const videos = await getFilteredVideos(genres, query, count, page, seed, targetIds);

    return NextResponse.json(videos);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json([], { status: 500 });
  }
}