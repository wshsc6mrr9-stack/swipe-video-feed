import { NextResponse } from "next/server";
import { redis } from "@/lib/upstash"; // ご自身のUpstash設定に合わせてください
import { nanoid } from "nanoid";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // 1. 🔐 認証チェック
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");

    if (!process.env.ADMIN_PASSWORD || token !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // 2. 📦 データの受け取り
    const body = await req.json();

    // 3. 📝 保存データの整形
    const newVideo = {
      id: nanoid(),
      title: body.title || "無題",
      videoUrl: body.videoUrl || "",
      pageUrl: body.pageUrl || "",
      affUrl: body.affUrl || "",
      affLabel: body.affLabel || "商品を見る",
      genres: body.genres || [],
      createdAt: Date.now(),
    };

    // 4. 🚀 Redis (videos:all) へ直接ZADD
    // UpstashのZADD仕様: zadd(key, { score, member })
    await redis.zadd("videos:all", {
      score: newVideo.createdAt,
      member: JSON.stringify(newVideo)
    });

    // 5. ✅ 成功レスポンス
    return NextResponse.json({ ok: true, inserted: 1, videoId: newVideo.id });

  } catch (error: any) {
    console.error("Import API Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}