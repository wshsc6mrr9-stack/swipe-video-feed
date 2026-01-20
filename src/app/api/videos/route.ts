// src/app/api/videos/route.ts
import { NextResponse } from "next/server";
import type { VideoItem } from "@/lib/types";
import { promises as fs } from "fs";
import path from "path";

export async function GET() {
  try {
    const p = path.join(process.cwd(), "public", "videos.json");
    const txt = await fs.readFile(p, "utf-8");
    const v = JSON.parse(txt);
    const items: VideoItem[] = Array.isArray(v) ? v : [];
    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ ok: true, items: [] });
  }
}

// ✅ 本番は「見せるだけ」なので塞ぐ
export async function POST() {
  return NextResponse.json({ ok: false, error: "read-only" }, { status: 403 });
}
export async function DELETE() {
  return NextResponse.json({ ok: false, error: "read-only" }, { status: 403 });
}
