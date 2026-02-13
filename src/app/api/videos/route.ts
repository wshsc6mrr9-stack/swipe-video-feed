import { redis } from "@/lib/redis";

const KEY = "videos"; // ← 絶対これ一択にする

export async function addVideo(video: any) {
  const item = {
    id: crypto.randomUUID(),
    ...video,
    createdAt: Date.now(),
  };

  await redis.lpush(KEY, JSON.stringify(item));
  return item;
}

export async function listVideos() {
  const rows = await redis.lrange(KEY, 0, -1);
  return rows.map((r) => JSON.parse(r));
}
