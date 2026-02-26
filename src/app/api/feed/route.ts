import { NextResponse } from "next/server";
import { getFilteredVideos } from "@/lib/redis";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// シャッフル用関数
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const genresParam = searchParams.get('genres');
    const queryParam = searchParams.get('query') || "";

    let genres: string[] = [];
    if (genresParam) {
      genres = genresParam.split(',');
    }

    // ★ 解決の鍵：最新の50件ではなく、全件（10000件）を取得して混ぜる
    const allVideos = await getFilteredVideos(genres, queryParam, 10000);

    // データが配列でない場合（オブジェクト等）の安全対策
    let videoList = Array.isArray(allVideos) ? allVideos : (allVideos as any)?.items || [];

    // サーバー側で全動画を完全にシャッフル
    const shuffledVideos = shuffleArray(videoList);

    // その中からランダムな50件だけをクライアントに返す
    const responseVideos = shuffledVideos.slice(0, 50);

    return NextResponse.json(responseVideos, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  } catch (e) {
    console.error("Feed API Error:", e);
    return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
  }
}