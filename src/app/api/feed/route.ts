import { NextResponse } from "next/server";
import { getFilteredVideos } from "@/lib/redis";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // URLからジャンルと検索ワードを受け取る
    const { searchParams } = new URL(request.url);
    const genresParam = searchParams.get('genres');
    const queryParam = searchParams.get('query') || "";

    let genres: string[] = [];
    if (genresParam) {
      genres = genresParam.split(',');
    }

    // データベース検索を実行
    const videos = await getFilteredVideos(genres, queryParam, 50);
    return NextResponse.json(videos);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
  }
}