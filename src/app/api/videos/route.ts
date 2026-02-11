export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { listVideos } from "@/lib/videosStore";

export async function GET() {
  const items = await listVideos();
  return NextResponse.json(
    { ok: true, items },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}