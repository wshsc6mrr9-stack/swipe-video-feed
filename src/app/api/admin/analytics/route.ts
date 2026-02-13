import { NextResponse } from "next/server";
import { listVideos } from "@/lib/videosStore";
import { getCounts } from "@/lib/statsStore";

export async function GET() {
  try {
    // ✅ listVideos は「配列」を返す
    const items = await listVideos();

    const ids = items.map((v: any) => String(v.id));

    const plays = await getCounts(ids, "play");
    const clicks = await getCounts(ids, "aff_click");

    const rows = items.map((v: any) => {
      const id = String(v.id);
      return {
        ...v,
        play: plays[id] ?? 0,
        aff_click: clicks[id] ?? 0,
      };
    });

    return NextResponse.json({
      ok: true,
      items: rows,
      total: rows.length,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "ANALYTICS_FAILED" },
      { status: 500 }
    );
  }
}
