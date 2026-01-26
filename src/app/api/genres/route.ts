// src/app/api/genres/route.ts
import { NextResponse } from "next/server";
import { GENRE_SEO_MAP } from "@/lib/genres";

export async function GET() {
  const keys = Object.keys(GENRE_SEO_MAP || {}).sort();
  return NextResponse.json({ ok: true, keys });
}
