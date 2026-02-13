export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { listVideos } from "@/lib/videosStore";

export async function GET() {
  try {
    const items = await listVideos();
    return NextResponse.json(
      { ok: true, items },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "LIST_FAILED" },
      { status: 500 }
    );
  }
}
