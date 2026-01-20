// src/lib/types.ts
export type VideoItem = {
  id: string;
  title: string;
  url: string;
  srcType: "mp4" | "hls";
  createdAt: number;
  poster?: string;
  affUrl?: string;
  affLabel?: string;
};
