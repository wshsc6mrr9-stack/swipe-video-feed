import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

let allVideosCache: any[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 1000 * 60 * 5; 

// シード（種）を使って常に同じ順序の乱数を生成する関数
function mulberry32(a: number) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// シード値を用いた完全シャッフル
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
  seed: number = 0
): Promise<any[]> {
  try {
    const isAll = genres.length === 0 || genres.includes("all") || genres.includes("likes");
    const hasQuery = query.trim().length > 0;
    
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

    if (!isAll) {
      const want = new Set(genres);
      filtered = filtered.filter((v: any) => {
        const tags = Array.isArray(v.genres) ? v.genres : (typeof v.genre === "string" ? [v.genre] : []);
        return tags.some((t: any) => want.has(String(t)));
      });
    }

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

    // ★ 山札全体をシード値でシャッフル
    const shuffled = shuffleWithSeed(filtered, seed);
    
    // ★ 指定されたページの分（50枚）だけを切り取って渡す
    const startIndex = (page - 1) * count;
    return shuffled.slice(startIndex, Math.min(startIndex + count, shuffled.length));

  } catch (e) {
    console.error("Redis fetch error:", e);
    return [];
  }
}