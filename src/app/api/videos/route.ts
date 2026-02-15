export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";
// 🚨 redis から直接取得するように変更し、軽量化します
import { redis } from "@/lib/redis"; 
import { revalidatePath } from "next/cache";

// ✅ 動画一覧を取得する (GET) - AnalyticsやAdmin用
export async function GET() {
  try {
    // 20MBの爆発を防ぐため、最新の100件に制限して取得します
    // これで Analytics 画面にデータが戻ってきます
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

    return NextResponse.json(
      { ok: true, items },
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "LIST_FAILED" },
      { status: 500 }
    );
  }
}

// ✅ 動画を追加する (POST) - AppleScriptやAdminからの追加用
export async function POST(req: Request) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");

    // パスワードチェック (環境変数または直接入力)
    const ADMIN_PASS = process.env.ADMIN_PASSWORD || "mdoskldmnvopdkmfjsps6hd9hs9hd0d";
    
    if (token !== ADMIN_PASS) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    
    // データの正規化
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

    // Redis のリストの先頭に追加
    await redis.lpush("videos", JSON.stringify(newVideo));

    // 各ページに「データが変わったよ」と通知
    revalidatePath("/");
    revalidatePath("/admin");
    revalidatePath("/api/videos");

    return NextResponse.json({
      ok: true,
      inserted: 1,
      video: newVideo,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "POST_FAILED" },
      { status: 500 }
    );
  }
}