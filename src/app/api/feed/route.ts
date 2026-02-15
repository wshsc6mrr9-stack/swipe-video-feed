import { NextResponse } from "next/server";
// 👇 修正ポイント: あなたの環境に合わせて "upstash" を "redis" に変更しました
import { getRandomVideos } from "@/lib/redis"; 

// 毎回ランダムに動画を取得するために必須の設定
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // ランダムに50個取得して返す
    const videos = await getRandomVideos(50);
    return NextResponse.json(videos);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to fetch feed" }, { status: 500 });
  }
}