import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();
const KEY_PREFIX = "likes:count:";
const RANKING_KEY = "video:ranking"; // ★追加: ランキング用のキー

function keyOf(videoId: string) {
  return `${KEY_PREFIX}${videoId}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const idsParam = url.searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 500);

  if (ids.length === 0) {
    return NextResponse.json({ ok: true, counts: {} });
  }

  // 複数キーを一括取得
  const counts: Record<string, number> = {};
  const pipeline = redis.pipeline();
  
  ids.forEach((id) => {
    pipeline.get(keyOf(id));
  });

  const results = await pipeline.exec();

  ids.forEach((id, i) => {
    const v = results[i];
    counts[id] = Number.isFinite(v) ? (v as number) : 0;
  });

  return NextResponse.json({ ok: true, counts });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const videoId = String(body?.videoId ?? "");
  const deltaRaw = Number(body?.delta ?? 0);

  if (!videoId) {
    return NextResponse.json({ ok: false, error: "videoId required" }, { status: 400 });
  }

  const delta = deltaRaw >= 1 ? 1 : deltaRaw <= -1 ? -1 : 0;
  if (!delta) {
    return NextResponse.json({ ok: false, error: "delta must be +1 or -1" }, { status: 400 });
  }

  const k = keyOf(videoId);
  
  // パイプラインで「個別カウント」と「ランキング」を同時に更新
  const pipeline = redis.pipeline();
  
  // 1. 個別のカウントを増減
  pipeline.incrby(k, delta);
  
  // 2. ランキング(Sorted Set)のスコアを増減
  // ZINCRBY video:ranking 1 videoId
  pipeline.zincrby(RANKING_KEY, delta, videoId);

  const results = await pipeline.exec();
  
  // results[0] は incrby の結果
  let nextCount = Number(results[0]);

  // マイナスになったら0に戻すガード処理
  if (nextCount < 0) {
    await redis.set(k, 0);
    await redis.zadd(RANKING_KEY, { score: 0, member: videoId });
    nextCount = 0;
  }

  return NextResponse.json({ ok: true, count: nextCount });
}