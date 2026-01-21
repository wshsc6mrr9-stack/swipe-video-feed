// src/app/api/videos/route.ts
import { NextResponse } from "next/server";
import { addVideo, deleteVideoById, listVideos } from "@/lib/videosStore";

export async function GET() {
  const items = await listVideos();
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const item = await addVideo(body);
    return NextResponse.json({ ok: true, item });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "bad request" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const id = String(body?.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
    }
    await deleteVideoById(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "bad request" },
      { status: 400 }
    );
  }
}
