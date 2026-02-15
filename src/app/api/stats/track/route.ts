import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export async function POST(req: Request) {
  try {
    const { videoId, type } = await req.json();
    if (!videoId || !type) return NextResponse.json({ ok: false }, { status: 400 });

    // 🚨 どんな型で送られてきても「純粋な文字列」に強制変換して保存
    const cleanId = String(videoId).trim();

    // 個別カウント
    await redis.hincrby(`stats:video:${cleanId}`, type, 1);
    // 全体カウント
    await redis.hincrby("stats:global", type, 1);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}