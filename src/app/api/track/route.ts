// src/app/api/track/route.ts
import { NextResponse } from "next/server";
import { incrEvent } from "@/lib/statsStore";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    const videoId = String(body?.videoId ?? "");
    const event = body?.event as "play" | "aff_click";

    if (!videoId || (event !== "play" && event !== "aff_click")) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    await incrEvent(videoId, event);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
