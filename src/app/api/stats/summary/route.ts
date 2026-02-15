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
      // 🚨 track側と完全に一致させるために、純粋な文字列としてIDを扱う
      const cleanId = String(v.id).trim();
      pipeline.hgetall(`stats:video:${cleanId}`);
    });

    const allStats = await pipeline.exec();

    const statsData = videoList.map((v: any, index: number) => {
      const s = allStats[index] as Record<string, string> | null;
      // 🚨 保存名に関わらず、play, click どちらかに入っていれば吸い出す
      const p = Number(s?.play || s?.playCount || 0);
      const c = Number(s?.click || s?.clickCount || 0);

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