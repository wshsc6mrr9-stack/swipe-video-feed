// src/app/api/sync-ranking/route.ts
import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const KEY_PREFIX = "likes:count:";
const RANKING_KEY = "video:ranking";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. likes:count:* のキーを全て取得
    // ※ keysコマンドは重いですが、管理用として1回だけ実行する前提
    const keys = await redis.keys(`${KEY_PREFIX}*`);
    
    if (keys.length === 0) {
      return NextResponse.json({ message: "No likes found to sync." });
    }

    // 2. 値を取得してパイプラインに入れる
    const pipeline = redis.pipeline();
    keys.forEach((k) => pipeline.get(k));
    const counts = await pipeline.exec();

    // 3. ランキング(ZSET)に登録する
    const updatePipeline = redis.pipeline();
    let syncedCount = 0;

    keys.forEach((key, i) => {
      const videoId = key.replace(KEY_PREFIX, "");
      const count = Number(counts[i]);
      if (count > 0) {
        // ZADD video:ranking {score} {member}
        updatePipeline.zadd(RANKING_KEY, { score: count, member: videoId });
        syncedCount++;
      }
    });

    await updatePipeline.exec();

    return NextResponse.json({ 
      ok: true, 
      message: `Synced ${syncedCount} videos to ranking.`,
      totalKeys: keys.length 
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}