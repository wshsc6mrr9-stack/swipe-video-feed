// src/lib/videosStore.ts
import type { VideoItem } from "@/lib/types";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_PATH = path.join(DATA_DIR, "videos.json");
const TMP_PATH = path.join(DATA_DIR, "videos.tmp.json");

function guessSrcType(url: string): VideoItem["srcType"] {
  return url.includes(".m3u8") ? "hls" : "mp4";
}

// 互換：affiliateUrl/affiliateLabel で来ても内部保存は affUrl/affLabel に統一
function normalizeAff(input: any): { affUrl?: string; affLabel?: string } {
  const rawUrl = (input?.affUrl ?? input?.affiliateUrl ?? undefined) as string | undefined;
  const rawLabel = (input?.affLabel ?? input?.affiliateLabel ?? undefined) as string | undefined;

  const affUrl = typeof rawUrl === "string" && rawUrl.trim() ? rawUrl.trim() : undefined;
  const affLabel = typeof rawLabel === "string" && rawLabel.trim() ? rawLabel.trim() : undefined;

  return { affUrl, affLabel };
}

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DATA_PATH);
  } catch {
    await fs.writeFile(DATA_PATH, "[]", "utf-8");
  }
}

function safeParseArray(txt: string): VideoItem[] {
  try {
    const v = JSON.parse(txt);
    return Array.isArray(v) ? (v as VideoItem[]) : [];
  } catch {
    return [];
  }
}

async function readAll(): Promise<VideoItem[]> {
  await ensureFile();
  const txt = await fs.readFile(DATA_PATH, "utf-8");
  return safeParseArray(txt);
}

async function writeAllAtomic(items: VideoItem[]) {
  await ensureFile();
  const json = JSON.stringify(items, null, 2);
  await fs.writeFile(TMP_PATH, json, "utf-8");
  await fs.rename(TMP_PATH, DATA_PATH);
}

function newId() {
  // @ts-ignore
  const uuid = globalThis?.crypto?.randomUUID?.();
  if (uuid) return uuid;
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function listVideos(): Promise<VideoItem[]> {
  const items = await readAll();
  return items.sort((a, b) => (Number(b?.createdAt) || 0) - (Number(a?.createdAt) || 0));
}

export async function addVideo(input: any): Promise<VideoItem> {
  const title = (input?.title ?? "").toString().trim();
  const url = (input?.url ?? input?.src ?? "").toString().trim();

  if (!title || !url) {
    throw new Error("title と url は必須");
  }

  const poster =
    typeof input?.poster === "string" && input.poster.trim()
      ? input.poster.trim()
      : undefined;

  const { affUrl, affLabel } = normalizeAff(input);

  const item: VideoItem = {
    id: newId(),
    title,
    url,
    srcType: guessSrcType(url),
    createdAt: Date.now(),
    poster,
    affUrl,
    affLabel,
  };

  const items = await readAll();
  items.unshift(item);
  await writeAllAtomic(items);

  return item;
}

export async function deleteVideoById(id: string): Promise<void> {
  const items = await readAll();
  const next = items.filter((x) => x?.id !== id);
  await writeAllAtomic(next);
}
