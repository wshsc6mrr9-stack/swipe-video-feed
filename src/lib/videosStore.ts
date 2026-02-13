import { redis } from "@/lib/upstash";

const KEY = "videos";

export async function addVideo(video: any) {
  await redis.lpush(KEY, JSON.stringify(video));
  return video;
}

export async function listVideos() {
  const rows = await redis.lrange(KEY, 0, -1);
  return rows.map((r) => JSON.parse(r));
}
