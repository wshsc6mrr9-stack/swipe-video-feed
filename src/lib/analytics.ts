// ===== src/lib/types.ts =====
export type VideoSrcType = "mp4" | "hls";

export type VideoMeta = {
  id: string;
  title: string;
  url: string;       // 例: "videos/1.mp4" or "https://....mp4"
  poster?: string;   // 例: "posters/1.jpg"
  duration?: number; // 秒（仮）
  tags?: string[];
  views?: number;    // 仮
  srcType?: VideoSrcType; // 将来HLS用
};// ===== src/lib/analytics.ts =====
export type AnalyticsEvent =
  | { type: "play_start"; videoId: string }
  | { type: "play_end"; videoId: string }
  | { type: "like_toggle"; videoId: string; value: boolean }
  | { type: "save_toggle"; videoId: string; value: boolean }
  | { type: "share_click"; videoId: string };

export function track(e: AnalyticsEvent) {
  console.log("[analytics]", e);
}

