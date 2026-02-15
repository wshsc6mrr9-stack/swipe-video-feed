import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 全体統計の取得
    const global = (await redis.hgetall("stats:global")) as Record<string, string> | null;
    
    // 最新動画の取得
    const rows = await redis.lrange("videos", 0, 199);
    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: true, totals: { play: 0, click: 0, ctr: 0 }, rows: [] });
    }

    const videoList = rows.map((r) => (typeof r === "string" ? JSON.parse(r) : r));

    // パイプラインで個別統計を一括取得
    const pipeline = redis.pipeline();
    videoList.forEach((v: any) => {
      pipeline.hgetall(`stats:video:${v.id}`);
    });
    const allStats = await pipeline.exec();

    // 🚀 ここで数値を確実にマッピング
    const statsData = videoList.map((v: any, index: number) => {
      const s = allStats[index] as Record<string, string> | null;
      const p = s && s.play ? parseInt(s.play, 10) : 0;
      const c = s && s.click ? parseInt(s.click, 10) : 0;
      
      return {
        id: v.id,
        title: v.title,
        genres: v.genres || [],
        play: p, // 画面側の期待する名前
        click: c,
        ctr: p > 0 ? (c / p) : 0,
        createdAt: v.createdAt
      };
    });

    return NextResponse.json({
      ok: true,
      totals: {
        play: parseInt(global?.play || "0", 10),
        click: parseInt(global?.click || "0", 10),
        ctr: parseInt(global?.play || "0", 10) > 0 
          ? (parseInt(global?.click || "0", 10) / parseInt(global?.play || "0", 10)) 
          : 0,
      },
      rows: statsData
    });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}