// src/lib/types.ts

export type SrcType = "mp4" | "hls";

// フィード・管理画面・VideoPlayer が受け取っても困らない「ゆるい型（互換用）」
export type VideoMeta = {
  id: string;
  title: string;

  // 互換：どっちでも来る可能性がある
  url?: string;
  src?: string;

  poster?: string;

  // アフィ（互換含む）
  affiliateUrl?: string;
  affiliateLabel?: string;

  // ✅ 互換：旧 genre / 新 genres
  genre?: string;
  genres?: string[];

  // たまに付いてくる場合がある
  srcType?: SrcType;
  createdAt?: number;
};

// API / store 側で “揃える” 最終形
export type VideoItem = {
  id: string;
  title: string;
  url: string;
  srcType: SrcType;
  createdAt: number;

  poster?: string;
  affiliateUrl?: string;
  affiliateLabel?: string;

  // ✅ 新：複数ジャンル
  genres?: string[];

  // ✅ 旧互換：残す（読み取り用）
  genre?: string;
};

function normalizeGenres(v: any): string[] | undefined {
  // 新：genres が配列で来たら優先
  const raw = Array.isArray(v?.genres) ? v.genres : null;
  if (raw) {
    const cleaned = raw
      .map((x: any) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean);
    if (cleaned.length) return Array.from(new Set(cleaned));
  }

  // 旧：genre しか無いなら配列化
  const g = typeof v?.genre === "string" ? v.genre.trim() : "";
  if (g) return [g];

  return undefined;
}

// VideoMeta -> VideoItem に揃える（VideoCardで使える）
export function normalizeToItem(v: VideoMeta): VideoItem {
  const url = (v.url ?? v.src ?? "").trim();

  const srcType: SrcType =
    v.srcType ?? (url.includes(".m3u8") ? "hls" : "mp4");

  const genres = normalizeGenres(v);

  return {
    id: String(v.id),
    title: String(v.title ?? ""),
    url,
    srcType,
    createdAt: Number.isFinite(v.createdAt as number)
      ? (v.createdAt as number)
      : Date.now(),
    poster: v.poster?.trim() || undefined,
    affiliateUrl: v.affiliateUrl?.trim() || undefined,
    affiliateLabel: v.affiliateLabel?.trim() || undefined,

    genres,
    // 旧互換（UI表示などで残っててもOK）
    genre: typeof v.genre === "string" && v.genre.trim() ? v.genre.trim() : undefined,
  };
}
