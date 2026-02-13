import { redis } from "@/lib/upstash";

const KEY = "videos";

export type VideoItem = {
  id: string;
  title: string;
  url: string;
  poster?: string;
  affUrl?: string;
  affLabel?: string;
  genres?: string[];
  genre?: string;
  createdAt: number;
};

export async function addVideo(input: any): Promise<VideoItem> {
  const video: VideoItem = {
    id: crypto.randomUUID(),
    title: String(input.title || "").trim() || "Untitled",
    url: String(input.url || "").trim(),
    poster: String(input.poster || "").trim(),
    affUrl: String(input.affUrl || "").trim(),
    affLabel: String(input.affLabel || "").trim(),
    genres: Array.isArray(input.genres) ? input.genres : [],
    genre: String(input.genre || "other"),
    createdAt: Date.now(),
  };

  await redis.lpush(KEY, JSON.stringify(video));
  return video;
}

export async function listVideos(): Promise<VideoItem[]> {
  const rows = await redis.lrange(KEY, 0, -1);
  return rows.map((r) => JSON.parse(r));
}
