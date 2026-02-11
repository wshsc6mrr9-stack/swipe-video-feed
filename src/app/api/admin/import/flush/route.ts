import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";
import { nanoid } from "nanoid";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // 🔐 ADMIN 認証
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");

    if (!process.env.ADMIN_PASSWORD || token !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 📥 queue 取得
    const items = await kv.lrange("import:queue", 0, -1);

    let inserted = 0;

    for (const raw of items) {
      const v = typeof raw === "string" ? JSON.parse(raw) : raw;

      const video = {
        id: nanoid(),
        title: v.title,
        videoUrl: v.videoUrl,
        pageUrl: v.pageUrl,
        affUrl: v.affUrl,
        affLabel: v.affLabel ?? "商品を見る",
        genres: v.genres ?? [],
        createdAt: Date.now(),
      };

      // 🔴 ここが重要：管理画面と同じキー
      await kv.lpush("videos:list", JSON.stringify(video));

      inserted++;
    }

    // 🧹 queue を空にする
    await kv.del("import:queue");

    return NextResponse.json({ ok: true, inserted });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: String(e) },
      { status: 500 }
    );
  }
}
