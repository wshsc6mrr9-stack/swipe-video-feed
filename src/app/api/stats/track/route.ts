import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function POST(req: Request) {
  try {
    const { videoId, type } = await req.json();
    if (!videoId || !type) return NextResponse.json({ ok: false }, { status: 400 });

    // IDを綺麗にする
    const cleanId = String(videoId).trim();

    // 1. 個別動画のカウント
    await redis.hincrby(`stats:video:${cleanId}`, type, 1);
    
    // 2. 全体の合計
    await redis.hincrby("stats:global", type, 1);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}