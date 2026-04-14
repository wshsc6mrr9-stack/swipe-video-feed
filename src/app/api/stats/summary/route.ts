import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";
// Cache-Controlヘッダーでエッジキャッシュを制御（revalidateはforce-dynamicと競合するため削除）

export async function GET() {
  try {
    // llen + chunked lrange → lrange(0,-1) の1回に削減
    // 動画リストと統計を並行取得
    const [rawRows] = await Promise.all([
      redis.lrange("videos", 0, -1),
    ]);

    if (!rawRows || rawRows.length === 0) {
      return NextResponse.json(
        { ok: true, totals: { play: 0, click: 0, ctr: 0 }, rows: [] },
        { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
      );
    }

    const videoList = rawRows
      .map((r) => {
        try { return typeof r === "string" ? JSON.parse(r) : r; }
        catch { return null; }
      })
      .filter(Boolean);

    if (videoList.length === 0) {
      return NextResponse.json(
        { ok: true, totals: { play: 0, click: 0, ctr: 0 }, rows: [] },
        { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
      );
    }

    // 全動画の統計を1回のパイプラインで並行取得
    const pipeline = redis.pipeline();
    videoList.forEach((v: any) => {
      const cleanId = String(v.id || v._id || "").trim();
      pipeline.hgetall(`stats:video:${cleanId}`);
    });
    const allStats = await pipeline.exec();

    let totalPlay = 0;
    let totalClick = 0;

    const statsData = videoList.map((v: any, i: number) => {
      const s = allStats[i] as Record<string, string> | null;
      const p = s ? parseInt(String(s.play  || "0"), 10) : 0;
      const c = s ? parseInt(String(s.click || "0"), 10) : 0;
      totalPlay  += p;
      totalClick += c;
      return {
        id:        String(v.id || v._id || ""),
        title:     v.title || "Untitled",
        genres:    Array.isArray(v.genres) ? v.genres : [],
        play:      p,
        click:     c,
        ctr:       p > 0 ? c / p : 0,
        createdAt: Number(v.createdAt || 0),
      };
    });

    return NextResponse.json(
      {
        ok: true,
        totals: {
          play:  totalPlay,
          click: totalClick,
          ctr:   totalPlay > 0 ? totalClick / totalPlay : 0,
        },
        rows: statsData,
      },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
    );
  } catch (e) {
    console.error("stats/summary error:", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
