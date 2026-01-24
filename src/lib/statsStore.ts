// src/lib/statsStore.ts
import { Redis } from "@upstash/redis";

const redis = Redis.fromEnv();

function k(event: string, videoId: string) {
  return `stats:${event}:${videoId}`;
}

export async function incrEvent(videoId: string, event: "play" | "aff_click") {
  if (!videoId) return;
  await redis.incr(k(event, videoId));
}

export async function getCounts(
  videoIds: string[],
  event: "play" | "aff_click"
): Promise<Record<string, number>> {
  const ids = Array.from(new Set(videoIds)).filter(Boolean);
  if (!ids.length) return {};

  // mget でまとめて取得
  const keys = ids.map((id) => k(event, id));
  const vals = (await redis.mget<number[]>(...keys)) as any[];

  const out: Record<string, number> = {};
  ids.forEach((id, i) => {
    const v = Number(vals?.[i] ?? 0);
    out[id] = Number.isFinite(v) ? v : 0;
  });
  return out;
}
