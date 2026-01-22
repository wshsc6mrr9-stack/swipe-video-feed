// src/lib/videosStore.ts
import { Redis } from "@upstash/redis";

export type VideoItem = {
  id: string;
  title: string;
  url: string; // mp4 or m3u8
  poster?: string;
  affUrl?: string;
  affLabel?: string;
  createdAt: number;
};

const redis = Redis.fromEnv();
const KEY = "videos:all";

function safeJsonParse<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function normalizeText(v: any): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t : undefined;
}

function normalizeInput(input: any) {
  const title = normalizeText(input?.title);
  const url = normalizeText(input?.url ?? input?.src); // 互換
  const poster = normalizeText(input?.poster);

  // 互換：affiliateUrl/affiliateLabel も吸う
  const affUrl = normalizeText(input?.affUrl ?? input?.affiliateUrl);
  const affLabel = normalizeText(input?.affLabel ?? input?.affiliateLabel);

  return { title, url, poster, affUrl, affLabel };
}

function newId() {
  // Node/Vercel なら crypto.randomUUID がある
  // 古い環境対策
  // @ts-ignore
  if (typeof crypto !== "undefined" && crypto?.randomUUID) {
    // @ts-ignore
    return crypto.randomUUID();
  }
  return `v_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function readAll(): Promise<VideoItem[]> {
  // Upstash は JSON をそのまま保存できる（文字列にしなくてOK）
  const data = await redis.get<VideoItem[]>(KEY);
  return Array.isArray(data) ? data : [];
}

async function writeAll(items: VideoItem[]) {
  await redis.set(KEY, items);
}

export async function listVideos(): Promise<VideoItem[]> {
  const items = await readAll();
  // 新しい順
  return items.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

export async function addVideo(input: any): Promise<VideoItem> {
  const { title, url, poster, affUrl, affLabel } = normalizeInput(input);

  if (!title || !url) {
    throw new Error("title と url は必須");
  }

  const item: VideoItem = {
    id: newId(),
    title,
    url,
    poster,
    affUrl,
    affLabel,
    createdAt: Date.now(),
  };

  const items = await readAll();
  items.push(item);
  await writeAll(items);

  return item;
}

export async function deleteVideoById(id: string): Promise<{ removed: number }> {
  const items = await readAll();
  const before = items.length;
  const next = items.filter((v) => v.id !== id);
  const removed = before - next.length;

  await writeAll(next);
  return { removed };
}
