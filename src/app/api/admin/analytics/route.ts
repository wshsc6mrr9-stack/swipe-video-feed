export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFilteredVideos } from "@/lib/redis";
import { redis } from "@/lib/redis";

export async function GET() {
  try {
    // 全動画を取得
    const items = await getFilteredVideos(undefined, "", 9999, 1, 0);

    const pipeline = redis.pipeline();
    items.forEach((v: any) => {
      const id = String(v.id || "").trim();
      pipeline.hgetall(`stats:video:${id}`);
    });
    const allStats = await pipeline.exec();

    let totalPlay = 0;
    let totalClick = 0;

    const rows = items.map((v: any, i: number) => {
      const s = allStats[i] as Record<string, string> | null;
      const p = s ? parseInt(String(s.play  || "0"), 10) : 0;
      const c = s ? parseInt(String(s.click || "0"), 10) : 0;
      totalPlay  += p;
      totalClick += c;
      return {
        ...v,
        play:      p,
        aff_click: c,
        click:     c,
      };
    });

    return NextResponse.json({
      ok: true,
      items: rows,
      total: rows.length,
      totals: {
        play:  totalPlay,
        click: totalClick,
        ctr:   totalPlay > 0 ? totalClick / totalPlay : 0,
      },
    });
  } catch (e: any) {
    console.error("[admin/analytics]", e?.message ?? e);
    return NextResponse.json(
      { ok: false, error: e?.message || "ANALYTICS_FAILED" },
      { status: 500 }
    );
  }
}
