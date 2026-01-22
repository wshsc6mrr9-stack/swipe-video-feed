// src/app/api/videos/route.ts
import { NextResponse } from "next/server";
import { addVideo, deleteVideoById, listVideos } from "@/lib/videosStore";

export async function GET() {
  const items = await listVideos();
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  try {
    const item = await addVideo(body);
    return NextResponse.json({ ok: true, item });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "failed" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request) {
  // ✅ ここがポイント：DELETEは body じゃなく query で受ける
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? "";

  if (!id) {
    return NextResponse.json({ ok: false, error: "idが必要" }, { status: 400 });
  }

  const result = await deleteVideoById(id);
  return NextResponse.json({ ok: true, result });
}
