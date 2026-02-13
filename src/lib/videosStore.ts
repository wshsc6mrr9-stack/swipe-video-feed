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
  createdAt: number;
  [key: string]: any;
};

/** ✅ 動画を追加する */
export async function addVideo(video: any): Promise<VideoItem | null> {
  try {
    const normalized: VideoItem = {
      id: String(video.id ?? crypto.randomUUID()),
      title: String(video.title || ""),
      url: String(video.url || ""),
      poster: String(video.poster || ""),
      affUrl: String(video.affUrl || ""),
      affLabel: String(video.affLabel || "商品を見る"),
      genres: Array.isArray(video.genres) ? video.genres : ["other"],
      createdAt: Date.now(),
    };

    // LPUSH で Redis のリストの先頭に追加
    await redis.lpush(KEY, JSON.stringify(normalized));
    return normalized;
  } catch (e) {
    console.error("Redis Add Error:", e);
    return null;
  }
}

/** ✅ 動画一覧を取得する */
export async function listVideos(): Promise<VideoItem[]> {
  try {
    const rows = await redis.lrange(KEY, 0, -1);
    if (!rows) return [];

    return rows
      .map((r) => {
        try {
          return typeof r === "string" ? JSON.parse(r) : r;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as VideoItem[];
  } catch (e) {
    console.error("Redis List Error:", e);
    return [];
  }
}

/** ✅ 全削除（必要であれば） */
export async function clearAllVideos(): Promise<void> {
  await redis.del(KEY);
}