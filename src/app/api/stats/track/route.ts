import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic"; // Turbopack dev環境でPOSTが無視されるのを防ぐ

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const videoId = String(body?.videoId ?? "").trim();
    const type    = String(body?.type    ?? "").trim();

    if (!videoId || !type) {
      return NextResponse.json({ ok: false, reason: "missing videoId or type" }, { status: 400 });
    }

    // 個別カウント（hash: stats:video:{id} → field: play / click）
    await redis.hincrby(`stats:video:${videoId}`, type, 1);
    // 全体カウント
    await redis.hincrby("stats:global", type, 1);

    return NextResponse.json({ ok: true, videoId, type });
  } catch (e: any) {
    console.error("[stats/track] error:", e?.message ?? e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
