// src/app/api/admin/analytics/route.ts
import { NextResponse } from "next/server";
import { listVideos } from "@/lib/videosStore";
import { getCounts } from "@/lib/statsStore";

export async function GET() {
  const videos = await listVideos();
  const ids = videos.map((v: any) => String(v.id));

  const plays = await getCounts(ids, "play");
  const clicks = await getCounts(ids, "aff_click");

  const rows = videos.map((v: any) => {
    const id = String(v.id);
    const play = plays[id] ?? 0;
    const click = clicks[id] ?? 0;
    const ctr = play > 0 ? click / play : 0;

    return {
      id,
      title: v.title ?? "",
      url: v.url ?? "",
      genres: v.genres ?? (v.genre ? [v.genre] : []),
      play,
      click,
      ctr,
      createdAt: v.createdAt ?? 0,
    };
  });

  const totalPlay = rows.reduce((s, r) => s + r.play, 0);
  const totalClick = rows.reduce((s, r) => s + r.click, 0);
  const totalCtr = totalPlay > 0 ? totalClick / totalPlay : 0;

  return NextResponse.json({
    ok: true,
    totals: { play: totalPlay, click: totalClick, ctr: totalCtr },
    rows,
  });
}
