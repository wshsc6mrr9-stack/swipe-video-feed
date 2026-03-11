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
  duration?: number;
  pageUrl?: string;
  source?: string;
  [key: string]: any;
};

function toSafeNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** ✅ 動画を追加する */
export async function addVideo(video: any): Promise<VideoItem | null> {
  try {
    const normalized: VideoItem = {
      id: String(video.id ?? crypto.randomUUID()),
      title: String(video.title || ""),
      url: String(video.url || ""),
      poster: String(video.poster || ""),
      affUrl: String(video.affUrl ?? video.affiliateUrl ?? ""),
      affLabel: String(video.affLabel ?? video.affiliateLabel ?? "商品を見る"),
      genres: Array.isArray(video.genres) ? video.genres : ["other"],
      createdAt: Number(video.createdAt ?? Date.now()),
      duration:
        toSafeNumber(video.duration) ??
        toSafeNumber(video.videoDuration) ??
        toSafeNumber(video.totalDuration) ??
        toSafeNumber(video.lengthSec) ??
        toSafeNumber(video.durationSec),
      pageUrl: String(video.pageUrl || ""),
      source: String(video.source || ""),
    };

    // 元データの他フィールドも残す
    const merged = {
      ...video,
      ...normalized,
    };

    await redis.lpush(KEY, JSON.stringify(merged));
    return merged;
  } catch (e) {
    console.error("Redis Add Error:", e);
    return null;
  }
}

/** ✅ 動画一覧を取得する（最新50件に制限してクラッシュ回避） */
export async function listVideos(): Promise<VideoItem[]> {
  try {
    const rows = await redis.lrange(KEY, 0, 49);
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