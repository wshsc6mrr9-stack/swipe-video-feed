import { redis } from "@/lib/upstash";

const KEY = "videos";

export type VideoItem = {
  id: string;
  title?: string;
  url?: string;
  poster?: string;
  [key: string]: any;
};

export async function addVideo(video: any): Promise<VideoItem> {
  // 🔒 必ず「プレーンな object → JSON文字列」にする
  const normalized: VideoItem = {
    id: String(video.id ?? crypto.randomUUID()),
    title: video.title ?? "",
    url: video.url ?? "",
    poster: video.poster ?? "",
    ...video,
  };

  await redis.lpush(KEY, JSON.stringify(normalized));
  return normalized;
}

export async function listVideos(): Promise<VideoItem[]> {
  const rows = await redis.lrange(KEY, 0, -1);

  return rows
    .map((r) => {
      try {
        return JSON.parse(r);
      } catch {
        return null; // 💥 壊れたデータは無視
      }
    })
    .filter(Boolean) as VideoItem[];
}
