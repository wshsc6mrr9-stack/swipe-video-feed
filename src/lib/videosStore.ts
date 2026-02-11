import { Redis } from "@upstash/redis";

export type VideoItem = {
  id: string;
  title: string;
  url: string; 
  poster?: string;
  affUrl?: string;
  affLabel?: string;
  createdAt: number;
  genres?: string[];
  genre?: string;
};

const redis = Redis.fromEnv();
const KEY = "videos:all";

async function readAll(): Promise<VideoItem[]> {
  const data = await redis.get<VideoItem[]>(KEY);
  return Array.isArray(data) ? data : [];
}

async function writeAll(items: VideoItem[]) {
  await redis.set(KEY, items);
}

export async function listVideos(): Promise<VideoItem[]> {
  const items = await readAll();
  return items.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export async function addVideo(input: any): Promise<VideoItem> {
  const items = await readAll();
  
  const item: VideoItem = {
    id: `v_${Date.now()}`,
    title: input.title || "無題",
    url: input.videoUrl || input.url || "", // 両方のキーに対応
    poster: input.poster || "",
    affUrl: input.affUrl || "",
    affLabel: input.affLabel || "商品を見る",
    genres: input.genres || ["other"],
    genre: input.genres?.[0] || "other",
    createdAt: Date.now(),
  };

  items.push(item);
  await writeAll(items);
  return item;
}

export async function deleteVideoById(id: string): Promise<{ removed: number }> {
  const items = await readAll();
  const next = items.filter((v) => v.id !== id);
  const removed = items.length - next.length;
  await writeAll(next);
  return { removed };
}