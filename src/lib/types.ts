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

  // ✅ アフィ（互換：新旧どっちでも来る）
  affiliateUrl?: string;
  affiliateLabel?: string;
  affUrl?: string;
  affLabel?: string;

  // ✅ 互換：旧 genre / 新 genres
  genre?: string;
  genres?: string[];

  // たまに付いてくる場合がある
  srcType?: SrcType;
  createdAt?: number;

  // ✅ いいね数（ランキング用）
  likeCount?: number;
};

// API / store 側で “揃える” 最終形（一覧/管理で使う）
export type VideoItem = {
  id: string;
  title: string;
  url: string;
  srcType: SrcType;
  createdAt: number;

  poster?: string;

  // ✅ 最終形は affiliateUrl 系に統一（UIで扱いやすい）
  affiliateUrl?: string;
  affiliateLabel?: string;

  // ✅ 新：複数ジャンル
  genres?: string[];

  // ✅ 旧互換：残す（読み取り用）
  genre?: string;

  // ✅ いいね数（任意）
  likeCount?: number;
};

function normalizeText(v: any): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t : undefined;
}

function normalizeGenres(v: any): string[] | undefined {
  // 新：genres が配列で来たら優先
  const raw = Array.isArray(v?.genres) ? v.genres : null;
  if (raw) {
    const cleaned = raw
      .map((x: any) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean)
      .filter((x: string) => x !== "ALL")
      .slice(0, 20);
    if (cleaned.length) return Array.from(new Set(cleaned));
  }

  // 旧：genre しか無いなら配列化
  const g = normalizeText(v?.genre);
  if (g && g !== "ALL") return [g];

  return undefined;
}

// VideoMeta -> VideoItem に揃える（UI/管理で扱う）
export function normalizeToItem(v: VideoMeta): VideoItem {
  const url = normalizeText(v.url ?? v.src) ?? "";

  const srcType: SrcType =
    v.srcType ?? (url.includes(".m3u8") ? "hls" : "mp4");

  const genres = normalizeGenres(v);

  // ✅ ここが重要：affUrl/affLabel も吸って affiliateUrl/label に統一
  const affiliateUrl = normalizeText(v.affiliateUrl ?? v.affUrl);
  const affiliateLabel = normalizeText(v.affiliateLabel ?? v.affLabel);

  return {
    id: String(v.id),
    title: String(v.title ?? ""),
    url,
    srcType,
    createdAt: Number.isFinite(v.createdAt as number)
      ? (v.createdAt as number)
      : Date.now(),
    poster: normalizeText(v.poster),

    affiliateUrl,
    affiliateLabel,

    genres,
    // 旧互換（UI表示などで残っててもOK）
    genre: normalizeText(v.genre),

    likeCount: Number.isFinite(v.likeCount as number) ? (v.likeCount as number) : undefined,
  };
}
