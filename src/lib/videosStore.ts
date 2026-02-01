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

  // ✅ 新：複数ジャンル
  genres?: string[];

  // ✅ 旧互換：残してもOK（過去データ/念のため）
  genre?: string;
};

const redis = Redis.fromEnv();
const KEY = "videos:all";

function normalizeText(v: any): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t : undefined;
}

function normalizeGenres(input: any): string[] | undefined {
  // 新：genres: string[]
  if (Array.isArray(input?.genres)) {
    const cleaned = input.genres
      .map((x: any) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean)
      .filter((x: string) => x !== "ALL")
      .slice(0, 20); // 念のため上限
    if (cleaned.length) return Array.from(new Set(cleaned));
  }

  // 旧：genre: string
  const g = normalizeText(input?.genre);
  if (g && g !== "ALL") return [g];

  return undefined;
}

function normalizeInput(input: any) {
  const title = normalizeText(input?.title);
  const url = normalizeText(input?.url ?? input?.src); // 互換
  const poster = normalizeText(input?.poster);

  // 互換：affiliateUrl/affiliateLabel も吸う
  const affUrl = normalizeText(input?.affUrl ?? input?.affiliateUrl);
  const affLabel = normalizeText(input?.affLabel ?? input?.affiliateLabel);

  const genres = normalizeGenres(input);

  return { title, url, poster, affUrl, affLabel, genres };
}

function newId() {
  // @ts-ignore
  if (typeof crypto !== "undefined" && crypto?.randomUUID) {
    // @ts-ignore
    return crypto.randomUUID();
  }
  return `v_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

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
  const { title, url, poster, affUrl, affLabel, genres } = normalizeInput(input);

  if (!title || !url) {
    throw new Error("title と url は必須");
  }

  const finalGenres = genres && genres.length ? genres : ["other"];

  const item: VideoItem = {
    id: newId(),
    title,
    url,
    poster,
    affUrl,
    affLabel,
    genres: finalGenres,

    // ✅ 旧互換（任意）：先頭を genre にも入れておくと、古い箇所が残ってても破綻しにくい
    genre: finalGenres[0],

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

// ✅ 追加：idで1件取得（OG画像生成などで使う）
export async function getVideoById(id: string): Promise<VideoItem | null> {
  const items = await readAll();
  const v = items.find((x) => x?.id === id);
  return v ?? null;
}
