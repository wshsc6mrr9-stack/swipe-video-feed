import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function POST(req: Request) {
  try {
    const { videoId, type } = await req.json();
    if (!videoId || !type) return NextResponse.json({ ok: false }, { status: 400 });

    // 🚨 IDを文字列化し、前後空白を消し、小文字に統一して「ズレ」をゼロにする
    const cleanId = String(videoId).trim().toLowerCase();

    // 1. 個別動画のカウントアップ
    await redis.hincrby(`stats:video:${cleanId}`, type, 1);
    
    // 2. 全体の合計カウントアップ
    await redis.hincrby("stats:global", type, 1);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}