import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
// 👇 src/lib/redis.ts の一番下に追加してください
export async function getRandomVideos(count: number = 50): Promise<any[]> {
  try {
    const total = await redis.llen("videos");
    if (total === 0) return [];
    const maxStartIndex = Math.max(0, total - count);
    const start = Math.floor(Math.random() * maxStartIndex);
    const rows = await redis.lrange("videos", start, start + count - 1);
    const videos = rows.map((r) => {
      try { return typeof r === "string" ? JSON.parse(r) : r; } catch { return null; }
    }).filter(Boolean);
    return videos.sort(() => Math.random() - 0.5);
  } catch (e) {
    return [];
  }
}