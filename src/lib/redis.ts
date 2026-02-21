import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 🌟 メモリキャッシュ用の変数
let allVideosCache: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 1000 * 60 * 5; // 5分間記憶する

export async function getFilteredVideos(genres: string[] = [], query: string = "", count: number = 50): Promise<any[]> {
  try {
    const isAll = genres.length === 0 || genres.includes("all") || genres.includes("likes");
    const hasQuery = query.trim().length > 0;
    
    // --- 1. トップ画面（検索・絞り込みなし） ---
    if (isAll && !hasQuery) {
      const total = await redis.llen("videos");
      if (total === 0) return [];
      const scanLimit = 2000;
      const maxStartIndex = Math.max(0, Math.min(total, scanLimit) - count);
      const start = Math.floor(Math.random() * maxStartIndex);
      const rows = await redis.lrange("videos", start, start + count - 1);
      const videos = rows.map((r) => {
        try { return typeof r === "string" ? JSON.parse(r) : r; } catch { return null; }
      }).filter(Boolean);
      return videos.sort(() => Math.random() - 0.5);
    }

    // --- 2. 検索・絞り込み時（キャッシュを利用して高速化） ---
    const now = Date.now();
    let allVideos = [];

    if (allVideosCache && (now - cacheTimestamp < CACHE_TTL)) {
      allVideos = allVideosCache;
    } else {
      const total = await redis.llen("videos");
      if (total === 0) return [];

      const CHUNK_SIZE = 1000;
      const promises = [];
      for (let i = 0; i < total; i += CHUNK_SIZE) {
        const end = Math.min(i + CHUNK_SIZE - 1, total - 1);
        promises.push(redis.lrange("videos", i, end));
      }
      const chunkedResults = await Promise.all(promises);
      
      allVideos = chunkedResults.flat().map((r) => {
        try { return typeof r === "string" ? JSON.parse(r) : r; } catch { return null; }
      }).filter(Boolean);

      allVideosCache = allVideos;
      cacheTimestamp = now;
    }

    // --- 3. メモリ上にある全データから絞り込み ---
    let filtered = allVideos;

    // ジャンル絞り込み
    if (!isAll) {
      const want = new Set(genres);
      filtered = filtered.filter((v: any) => {
        const tags = Array.isArray(v.genres) ? v.genres : (typeof v.genre === "string" ? [v.genre] : []);
        return tags.some((t: any) => want.has(String(t)));
      });
    }

    // 🌟 修正：柔軟なキーワード検索（AND検索）
    if (hasQuery) {
      // 全角スペースを半角に変換し、スペースで区切って配列にする
      const searchWords = query
        .normalize("NFKC")
        .toLowerCase()
        .replace(/　/g, " ")
        .split(/\s+/)
        .filter(w => w.length > 0);

      filtered = filtered.filter((v: any) => {
        const title = String(v.title || "").normalize("NFKC").toLowerCase();
        const affLabel = String(v.affLabel || v.affiliateLabel || "").normalize("NFKC").toLowerCase();
        // 検索対象のテキストを合体させておく
        const targetText = title + " " + affLabel;

        // 入力されたすべてのキーワードが targetText に含まれているかチェック
        return searchWords.every(word => targetText.includes(word));
      });
    }

    // 見つかったものから50件ランダムに返す
    return filtered.sort(() => Math.random() - 0.5).slice(0, count);

  } catch (e) {
    console.error("Redis fetch error:", e);
    return [];
  }
}