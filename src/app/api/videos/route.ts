export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
import { redis } from "@/lib/redis"; 
import { revalidatePath } from "next/cache";

// ✅ AnalyticsやAdmin一覧用 (GET)
export async function GET() {
  try {
    // 20MB爆発を防ぐため、最新の100件を取得
    const rows = await redis.lrange("videos", 0, 99);
    
    if (!rows) return NextResponse.json({ ok: true, items: [] });

    const items = rows
      .map((r) => {
        try {
          return typeof r === "string" ? JSON.parse(r) : r;
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    // Analytics画面が読み取れるように { ok: true, items: [...] } の形で返します
    return NextResponse.json(
      { ok: true, items },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "LIST_FAILED" }, { status: 500 });
  }
}

// ✅ 動画追加用 (POST)
export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    const ADMIN_PASS = "mdoskldmnvopdkmfjsps6hd9hs9hd0d";
    
    if (token !== ADMIN_PASS) return NextResponse.json({ ok: false }, { status: 401 });

    const body = await req.json();
    const newVideo = {
      id: String(body.id || crypto.randomUUID()),
      title: String(body.title || ""),
      url: String(body.url || ""),
      poster: String(body.poster || ""),
      affUrl: String(body.affUrl || ""),
      affLabel: String(body.affLabel || "商品を見る"),
      genres: Array.isArray(body.genres) ? body.genres : ["other"],
      createdAt: Date.now(),
    };

    await redis.lpush("videos", JSON.stringify(newVideo));

    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/api/videos");

    return NextResponse.json({ ok: true, video: newVideo });
  } catch (e: any) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}