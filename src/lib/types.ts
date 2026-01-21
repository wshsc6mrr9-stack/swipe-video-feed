// src/lib/types.ts

export type SrcType = "mp4" | "hls";

// アプリ内の標準
export type VideoItem = {
  id: string;
  title: string;

  // ✅ 必須（ここが undefined だとビルド落ちる）
  url: string;

  // なくても動くように optional（あとで整える）
  srcType?: SrcType;
  poster?: string;

  // アフィ
  affUrl?: string;
  affLabel?: string;

  createdAt?: number;
};

// 互換：昔のコードが VideoMeta を使っててもOK
export type VideoMeta = VideoItem & {
  // 旧フィールド
  src?: string;
  affiliateUrl?: string;
  affiliateLabel?: string;
};
