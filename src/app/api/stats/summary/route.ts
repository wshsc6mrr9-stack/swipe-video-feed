import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. 全体の合計を取得
    const global = (await redis.hgetall("stats:global")) as Record<string, string> | null;
    
    // 2. 最新の200件を取得
    const rows = await redis.lrange("videos", 0, 199);
    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: true, totals: { play: 0, click: 0, ctr: 0 }, rows: [] });
    }

    const videoList = rows.map((r) => (typeof r === "string" ? JSON.parse(r) : r));

    // 🚀 【重要】パイプラインで一括取得（これで爆速になります）
    const pipeline = redis.pipeline();
    videoList.forEach((v: any) => {
      pipeline.hgetall(`stats:video:${v.id}`);
    });
    const allStats = await pipeline.exec();

    const statsData = videoList.map((v: any, index: number) => {
      const s = allStats[index] as Record<string, string> | null;
      const p = Number(s?.play || 0);
      const c = Number(s?.click || 0);
      return {
        id: v.id,
        title: v.title,
        genres: v.genres || [],
        play: p,
        click: c,
        ctr: p > 0 ? (c / p) : 0,
        createdAt: v.createdAt
      };
    });

    return NextResponse.json({
      ok: true,
      totals: {
        play: Number(global?.play || 0),
        click: Number(global?.click || 0),
        ctr: Number(global?.play || 0) > 0 ? (Number(global?.click || 0) / Number(global?.play || 0)) : 0,
      },
      rows: statsData
    });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}