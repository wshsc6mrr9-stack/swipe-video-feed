import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Redisに "videos" リストの長さを問い合わせる
    const count = await redis.llen("videos");
    return NextResponse.json({ count });
  } catch (e) {
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}