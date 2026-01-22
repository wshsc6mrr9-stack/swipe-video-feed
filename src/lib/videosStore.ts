// src/lib/videosStore.ts
import { Redis } from "@upstash/redis";

export type VideoItem = {
  id: string;
  title: string;
  url: string; // mp4 or m3u8
  poster?: string;
  affiliateUrl?: string;
  affiliateLabel?: string;
  createdAt: number;
};

const redis = Redis.fromEnv();
const KEY = "videos:all";

function safeArray(v: unknown): VideoItem[] {
  return Array.isArray(v) ? (v as VideoItem[]) : [];
}

export async function listVideos(): Promise<VideoItem[]> {
  const data = await redis.get(KEY);
  const items = safeArray(data);
  // 新しい順
  items.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return items;
}

export async function addVideo(input: Omit<VideoItem, "id" | "createdAt">) {
  const now = Date.now();
  const item: VideoItem = {
    id: crypto.randomUUID(),
    createdAt: now,
    title: input.title.trim(),
    url: input.url.trim(),
    poster: input.poster?.trim() || undefined,
    affiliateUrl: input.affiliateUrl?.trim() || undefined,
    affiliateLabel: input.affiliateLabel?.trim() || undefined,
  };

  const cur = await listVideos();
  const next = [item, ...cur];
  await redis.set(KEY, next);

  return item;
}

export async function deleteVideoById(id: string) {
  const cur = await listVideos();
  const next = cur.filter((v) => v.id !== id);
  await redis.set(KEY, next);
  return { ok: true, before: cur.length, after: next.length };
}
