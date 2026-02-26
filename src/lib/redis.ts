import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

let allVideosCache: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 1000 * 60 * 5; 
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

export async function getFilteredVideos(
  genres: string[] = [], 
  query: string = "", 
  count: number = 50,
  page: number = 1,
  seed: number = 0,
  targetIds?: string[]
): Promise<any[]> {
  try {
    const isFavoritesMode = targetIds && targetIds.length > 0;
    const isRankingMode = !isFavoritesMode && (genres.includes("__likes__") || genres.includes("likes"));
    const isAll = !isFavoritesMode && !isRankingMode && (genres.length === 0 || genres.includes("all"));
    
    const hasQuery = query.trim().length > 0;
    
    // 1. 全データ取得 (キャッシュ)
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

    let filtered = allVideos;

    // 2. モード別の絞り込み
    if (isFavoritesMode) {
      const idSet = new Set(targetIds);
      filtered = filtered.filter((v: any) => idSet.has(String(v.id)));
    }
    else if (isRankingMode) {
      // ★エラー修正箇所1: zrevrange を zrange({ rev: true }) に変更
      const rankedIds = await redis.zrange(RANKING_KEY, 0, 2000, { rev: true });
      
      const rankMap = new Map<string, number>();
      
      // ★エラー修正箇所2: 型 (id: unknown, idx: number) を明示
      rankedIds.forEach((id: unknown, idx: number) => {
        rankMap.set(String(id), idx);
      });
      
      filtered.sort((a: any, b: any) => {
        const idA = String(a.id);
        const idB = String(b.id);
        const rankA = rankMap.has(idA) ? rankMap.get(idA)! : 999999;
        const rankB = rankMap.has(idB) ? rankMap.get(idB)! : 999999;
        return rankA - rankB;
      });
    }
    else if (!isAll) {
      const want = new Set(genres);
      filtered = filtered.filter((v: any) => {
        const tags = Array.isArray(v.genres) ? v.genres : (typeof v.genre === "string" ? [v.genre] : []);
        return tags.some((t: any) => want.has(String(t)));
      });
    }

    // 3. キーワード検索 (共通)
    if (hasQuery) {
      const searchWords = query
        .normalize("NFKC")
        .toLowerCase()
        .replace(/　/g, " ")
        .split(/\s+/)
        .filter(w => w.length > 0);

      filtered = filtered.filter((v: any) => {
        const title = String(v.title || "").normalize("NFKC").toLowerCase();
        const affLabel = String(v.affLabel || v.affiliateLabel || "").normalize("NFKC").toLowerCase();
        const targetText = title + " " + affLabel;
        return searchWords.every(word => targetText.includes(word));
      });
    }

    // 4. ページングとソート
    const startIndex = (page - 1) * count;

    if (isRankingMode) {
      return filtered.slice(startIndex, Math.min(startIndex + count, filtered.length));
    } 
    
    const shuffled = shuffleWithSeed(filtered, seed);
    return shuffled.slice(startIndex, Math.min(startIndex + count, shuffled.length));

  } catch (e) {
    console.error("Redis fetch error:", e);
    return [];
  }
}