import { NextResponse } from "next/server";
import { getFilteredVideos } from "@/lib/redis";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const genresParam = searchParams.get('genres');
    const queryParam = searchParams.get('query') || "";
    const pageParam = parseInt(searchParams.get('page') || "1", 10);
    const seedParam = parseInt(searchParams.get('seed') || "0", 10);
    const idsParam = searchParams.get('ids');

    let genres: string[] = [];
    if (genresParam) {
      genres = genresParam.split(',');
    }
    
    // ID指定があれば配列化
    let targetIds: string[] | undefined = undefined;
    if (idsParam) {
      targetIds = idsParam.split(',').map(s => s.trim()).filter(Boolean);
    }

    const responseVideos = await getFilteredVideos(genres, queryParam, 50, pageParam, seedParam, targetIds);

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