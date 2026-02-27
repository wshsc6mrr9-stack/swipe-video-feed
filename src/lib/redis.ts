import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

let allVideosCache: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 1000 * 60 * 5; // 5分キャッシュ
const RANKING_KEY = "video:ranking";

function mulberry32(a: number) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function shuffleWithSeed<T>(array: T[], seedNum: number): T[] {
  const random = mulberry32(seedNum);
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ★ 引数の順番を route.ts と完全に合わせる
export async function getFilteredVideos(
  genres: string[] = [], 
  query: string = "", 
  page: number = 1,     // さっきまでここが count になっていた可能性があります
  limit: number = 10,   // これを limit として統一
  seed: number = 0,
  targetIds?: string[]
): Promise<any[]> {
  try {
    const isFavoritesMode = targetIds && targetIds.length > 0;
    const isRankingMode = !isFavoritesMode && (genres.includes("__likes__") || genres.includes("likes"));
    
    // ジャンル指定がない、または "all" の場合は全件モード
    const isAll = !isFavoritesMode && !isRankingMode && (
      genres.length === 0 || 
      genres.some(g => ["all", "GENRE_ALL"].includes(String(g)))
    );
    
    // 1. 全データ取得（videosリストから）
    const now = Date.now();
    let allVideos = [];

    if (allVideosCache && (now - cacheTimestamp < CACHE_TTL)) {
      allVideos = allVideosCache;
    } else {
      // リストの長さを取得して全件取ってくる
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

    let filtered = allVideos;

    // 2. モード別フィルタリング
    if (isFavoritesMode) {
      const idSet = new Set(targetIds);
      filtered = filtered.filter((v: any) => idSet.has(String(v.id)));
    }
    else if (isRankingMode) {
      const rankedIds = await redis.zrange(RANKING_KEY, 0, 2000, { rev: true });
      const rankMap = new Map<string, number>();
      rankedIds.forEach((id: any, idx: number) => rankMap.set(String(id), idx));
      filtered.sort((a: any, b: any) => (rankMap.get(String(a.id)) ?? 99999) - (rankMap.get(String(b.id)) ?? 99999));
    }
    else if (!isAll) {
      // ★ 日本語タグでそのまま検索（余計な変換なし）
      const searchSet = new Set(genres.map(g => String(g).trim())); // .toLowerCase()も外して完全一致重視
      
      filtered = filtered.filter((v: any) => {
        // 動画データのタグを全て集める
        const videoTags = [
          ...(Array.isArray(v.genres) ? v.genres : []),
          v.genre,
          v.category
        ].filter(Boolean).map(t => String(t).trim());

        // どれか一つでも一致すればOK
        return videoTags.some(t => searchSet.has(t));
      });
    }

    // 3. キーワード検索
    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter(v => 
        String(v.title || "").toLowerCase().includes(q) ||
        String(v.id || "").toLowerCase().includes(q)
      );
    }

    // 4. ページネーション
    const start = (page - 1) * limit;
    if (isRankingMode) {
      return filtered.slice(start, start + limit);
    } 
    const shuffled = shuffleWithSeed(filtered, seed);
    return shuffled.slice(start, start + limit);

  } catch (e) {
    console.error("Redis Error:", e);
    return [];
  }
}