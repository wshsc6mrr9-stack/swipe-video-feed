import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const global = (await redis.hgetall("stats:global")) as Record<string, string> | null;
    const rows = await redis.lrange("videos", 0, 199);
    
    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: true, totals: { play: 0, click: 0, ctr: 0 }, rows: [] });
    }

    const videoList = rows.map((r) => (typeof r === "string" ? JSON.parse(r) : r));
    const pipeline = redis.pipeline();

    videoList.forEach((v: any) => {
      // 🚨 trim() を徹底し、IDの完全一致を狙う
      const cleanId = String(v.id || v._id || "").trim();
      pipeline.hgetall(`stats:video:${cleanId}`);
    });

    const allStats = await pipeline.exec();

    const statsData = videoList.map((v: any, index: number) => {
      const s = allStats[index] as Record<string, string> | null;
      
      // 🚨 Redisからは文字列で返るため、確実に数値変換。プロパティ名も 'play' に統一。
      const p = s ? parseInt(s.play || "0", 10) : 0;
      const c = s ? parseInt(s.click || "0", 10) : 0;

      return {
        id: v.id,
        title: v.title || "Untitled",
        genres: v.genres || [],
        play: p,
        click: c,
        ctr: p > 0 ? (c / p) : 0,
        createdAt: v.createdAt || 0
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