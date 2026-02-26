// src/app/api/feed/route.ts
import { NextResponse } from "next/server";
import { getFilteredVideos } from "@/lib/redis";
import { GENRE_SEO_MAP, type GenreKey } from "@/lib/genres";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const genresParam = searchParams.get("genres") || "";
    const query = searchParams.get("query") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const seed = parseInt(searchParams.get("seed") || "0", 10);

    // リクエストされたジャンル（例: ["gal"]）
    let genreArray = genresParam ? genresParam.split(",").filter(Boolean) : [];

    // ★ 解決策：URLのIDをDB内の日本語ラベルに変換して検索対象を広げる
    const expandedGenres = [...genreArray];
    genreArray.forEach((g) => {
      const seoInfo = GENRE_SEO_MAP[g as GenreKey];
      if (seoInfo && seoInfo.label) {
        // "gal" が来たら、DBにあるはずの "ギャル" も一緒に探すように追加
        expandedGenres.push(seoInfo.label);
      }
    });

    // 拡張されたキーワードでDBを検索
    const videos = await getFilteredVideos(expandedGenres, query, page, limit, seed);

    return NextResponse.json(videos);
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}