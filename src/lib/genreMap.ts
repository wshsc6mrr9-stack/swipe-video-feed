// ===== src/lib/genreMap.ts =====
// UI（日本語）→ Redis（英語タグ）変換表
// ※ 1対多OK。必要に応じて追加していくだけ。

export const GENRE_MAP: Record<string, string[]> = {
  // 日本語UI : Redis内の英語タグ
  "美少女": ["seductress", "exclusive"],
  "主観": ["pov"],
  "汗だく": ["cowgirl"],
  "ミニ系": ["petite"],
  "VR": ["vr", "vr-only", "high-quality-vr"],
  // 例）
  // "清楚": ["exclusive"],
  // "人妻": ["married"],
};