import { redis } from "@/lib/redis";

const KEY = "videos";

export async function addVideo(video: any) {
  const item = {
    id: crypto.randomUUID(),
    title: video.title,
    url: video.url,
    poster: video.poster || "",
    affUrl: video.affUrl || "",
    affLabel: video.affLabel || "",
    genres: video.genres || ["other"],
    genre: video.genres?.[0] || "other",
    createdAt: Date.now(),
  };

  // 👇 ここが最重要：LISTに入れる
  await redis.lpush(KEY, JSON.stringify(item));

  return item;
}

export async function listVideos() {
  const rows = await redis.lrange(KEY, 0, -1);
  return rows.map((r) => JSON.parse(r));
}
