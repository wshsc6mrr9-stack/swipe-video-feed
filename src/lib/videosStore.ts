import { Redis } from "@upstash/redis";
import { nanoid } from "nanoid";

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

// 🔑 Redis keys
const LIST_KEY = "videos:list";       // ID のみを積む
const ITEM_PREFIX = "videos:item:";   // 実体

/* =======================
   一覧取得（ページング対応）
======================= */
export async function listVideos(
  page = 1,
  limit = 50
): Promise<{ items: VideoItem[]; total: number }> {
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  const [ids, total] = await Promise.all([
    redis.lrange<string>(LIST_KEY, start, end),
    redis.llen(LIST_KEY),
  ]);

  if (!ids.length) {
    return { items: [], total };
  }

  const keys = ids.map((id) => ITEM_PREFIX + id);
  const items = (await redis.mget<VideoItem[]>(...keys))
    .filter(Boolean) as VideoItem[];

  return { items, total };
}

/* =======================
   🔥 強制追加（重複無視）
======================= */
export async function addVideo(input: any): Promise<VideoItem> {
  if (!input?.videoUrl && !input?.url) {
    throw new Error("INVALID_PAYLOAD");
  }

  const id = "v_" + nanoid(12);
  const itemKey = ITEM_PREFIX + id;

  const item: VideoItem = {
    id,
    title: input.title || "無題",
    url: input.videoUrl || input.url,
    poster: input.poster || "",
    affUrl: input.affUrl || "",
    affLabel: input.affLabel || "商品を見る",
    genres: input.genres || ["other"],
    genre: input.genres?.[0] || "other",
    createdAt: Date.now(),
  };

  // 実体保存
  await redis.set(itemKey, item);

  // 🔥 一覧に必ず追加（先頭）
  await redis.lpush(LIST_KEY, id);

  console.log("[ADD_VIDEO_OK]", id, item.title);

  return item;
}

/* =======================
   削除
======================= */
export async function deleteVideoById(
  id: string
): Promise<{ removed: number }> {
  const itemKey = ITEM_PREFIX + id;

  await Promise.all([
    redis.del(itemKey),
    redis.lrem(LIST_KEY, 0, id),
  ]);

  return { removed: 1 };
}
