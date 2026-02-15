import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. 全体合計
    const global = (await redis.hgetall("stats:global")) as Record<string, string> | null;
    
    // 2. 動画リスト取得
    const rows = await redis.lrange("videos", 0, 199);
    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: true, totals: { play: 0, click: 0, ctr: 0 }, rows: [] });
    }

    const videoList = rows.map((r) => (typeof r === "string" ? JSON.parse(r) : r));
    
    // 🚀 パイプラインで一括取得
    const pipeline = redis.pipeline();
    videoList.forEach((v: any) => {
      // 🚨 計測時と同じルール（小文字・空白なし）でIDを検索
      const cleanId = String(v.id).trim().toLowerCase();
      pipeline.hgetall(`stats:video:${cleanId}`);
    });

    const allStats = await pipeline.exec();

    const statsData = videoList.map((v: any, index: number) => {
      const s = allStats[index] as Record<string, string> | null;
      const p = Number(s?.play || 0);
      const c = Number(s?.click || 0);
      
      return {
        id: v.id,
        title: v.title || "Untitled",
        genres: v.genres || [],
        play: p,
        click: c,
        ctr: p > 0 ? (c / p) : 0,
        createdAt: Number(v.createdAt || 0)
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