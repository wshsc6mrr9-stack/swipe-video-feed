import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function POST(req: Request) {
  try {
    // ===== 認証 =====
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace("Bearer ", "");

    if (!process.env.IMPORT_TOKEN || token !== process.env.IMPORT_TOKEN) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // ===== payload =====
    const body = await req.json();

    const {
      source,
      pageUrl,
      title,
      videoUrl,
      genres = [],
      affUrl,
      affLabel,
    } = body;

    if (!pageUrl || !title) {
      return NextResponse.json(
        { ok: false, error: "INVALID_PAYLOAD" },
        { status: 400 }
      );
    }

    // ===== ID生成 =====
    const id =
      Buffer.from(pageUrl).toString("base64url") +
      "-" +
      Date.now().toString(36);

    const now = Date.now();

    // ===== 保存データ =====
    const video = {
      id,
      source,
      pageUrl,
      title,
      videoUrl,
      genres,
      affUrl,
      affLabel,

      status: "published",
      isPublic: true,
      publishedAt: now,
      createdAt: now,
    };

    // ===== 保存 =====
    await redis.set(`video:${id}`, video);

    // 管理画面用（登録済み管理）
    await redis.zadd("videos:all", {
      score: now,
      member: id,
    });

    // フロント用（公開フィード）
    await redis.zadd("videos:published", {
      score: now,
      member: id,
    });

    return NextResponse.json({
      ok: true,
      inserted: true,
      id,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e) },
      { status: 500 }
    );
  }
}
