import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function POST(req: Request) {
  try {
    const { videoId, type } = await req.json(); // type は "play" か "click"
    if (!videoId || !type) return NextResponse.json({ ok: false }, { status: 400 });

    const today = new Date().toISOString().split('T')[0]; // 2026-02-15 形式

    // 1. 全期間の累計をカウントアップ
    await redis.hincrby(`stats:video:${videoId}`, type, 1);
    
    // 2. サイト全体の合計をカウントアップ
    await redis.hincrby("stats:global", type, 1);

    // 3. 日別のアクセス数をカウントアップ（サイト全体の訪問者数用）
    if (type === "play") {
      await redis.hincrby("stats:daily:plays", today, 1);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}