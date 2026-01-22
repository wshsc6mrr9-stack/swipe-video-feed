// src/app/api/videos/route.ts
import { NextResponse } from "next/server";
import { addVideo, deleteVideoById, listVideos } from "@/lib/videosStore";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = await listVideos();
  return NextResponse.json({ ok: true, items });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body?.title || !body?.url) {
    return NextResponse.json(
      { ok: false, error: "title と url は必須" },
      { status: 400 }
    );
  }

  const item = await addVideo({
    title: String(body.title),
    url: String(body.url),
    poster: body.poster ? String(body.poster) : undefined,
    affiliateUrl: body.affiliateUrl ? String(body.affiliateUrl) : undefined,
    affiliateLabel: body.affiliateLabel ? String(body.affiliateLabel) : undefined,
  });

  return NextResponse.json({ ok: true, item });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "id が必要" }, { status: 400 });
  }

  const result = await deleteVideoById(id);
  return NextResponse.json({ ok: true, result });
}
