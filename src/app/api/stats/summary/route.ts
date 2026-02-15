import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. 全体の統計を取得（Record<string, string>として型を定義）
    const global = (await redis.hgetall("stats:global")) as Record<string, string> | null;
    const totalPlay = Number(global?.play || 0);
    const totalClick = Number(global?.click || 0);
    
    // 2. 分析用に最新の200件を取得
    const rows = await redis.lrange("videos", 0, 199);
    const statsData = [];

    for (const row of rows) {
      const v = typeof row === "string" ? JSON.parse(row) : row;
      
      // 個別動画の統計を取得
      const s = (await redis.hgetall(`stats:video:${v.id}`)) as Record<string, string> | null;
      const p = Number(s?.play || 0);
      const c = Number(s?.click || 0);
      
      statsData.push({
        id: v.id,
        title: v.title,
        genres: v.genres || [],
        play: p,
        click: c,
        ctr: p > 0 ? (c / p) : 0,
        createdAt: v.createdAt
      });
    }

    return NextResponse.json({
      ok: true,
      totals: {
        play: totalPlay,
        click: totalClick,
        ctr: totalPlay > 0 ? (totalClick / totalPlay) : 0,
      },
      rows: statsData
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}