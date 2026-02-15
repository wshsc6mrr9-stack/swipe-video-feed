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
      pipeline.hgetall(`stats:video:${v.id}`);
    });
    const allStats = await pipeline.exec();

    const statsData = videoList.map((v: any, index: number) => {
      const s = allStats[index] as Record<string, string> | null;
      // 🚨 画面側が探している名前に合わせて「play」「click」を確実に数値化
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