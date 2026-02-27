// src/lib/redis.ts
import { Redis } from "@upstash/redis";
import { GENRE_SEO_MAP, type GenreKey } from "./genres";

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

// ★ 修正：元の動いていた引数の順番（count が先、page が後）に戻す
export async function getFilteredVideos(
  genres: string[] = [], 
  query: string = "", 
  count: number = 50,  // ← countが第3引数
  page: number = 1,    // ← pageが第4引数
  seed: number = 0,
  targetIds?: string[]
): Promise<any[]> {
  try {
    const isFavoritesMode = targetIds && targetIds.length > 0;
    const isRankingMode = !isFavoritesMode && (genres.includes("__likes__") || genres.includes("likes"));
    
    // 全件表示の判定
    const isAll = !isFavoritesMode && !isRankingMode && (
      genres.length === 0 || 
      genres.some(g => ["all", "GENRE_ALL", "ランダム"].includes(String(g).trim().toLowerCase()))
    );
    
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

    if (isFavoritesMode) {
      const idSet = new Set(targetIds);
      filtered = filtered.filter((v: any) => idSet.has(String(v.id)));
    } else if (isRankingMode) {
      const rankedIds = await redis.zrange(RANKING_KEY, 0, 2000, { rev: true });
      const rankMap = new Map<string, number>();
      rankedIds.forEach((id: any, idx: number) => rankMap.set(String(id), idx));
      filtered.sort((a: any, b: any) => (rankMap.get(String(a.id)) ?? 99999) - (rankMap.get(String(b.id)) ?? 99999));
    } else if (!isAll) {
      // 日本語ジャンル検索
      const want = new Set<string>();
      genres.forEach(g => {
        const key = String(g).trim();
        want.add(key);
        want.add(key.toLowerCase());
        try {
          const seo = GENRE_SEO_MAP[key as GenreKey];
          if (seo?.label) want.add(seo.label);
        } catch(e) {}
      });

      filtered = filtered.filter((v: any) => {
        const tags = [
          ...(Array.isArray(v.genres) ? v.genres : []),
          v.genre,
          v.category
        ].filter(Boolean).map(t => String(t).trim());
        return tags.some(t => want.has(t) || want.has(t.toLowerCase()));
      });
    }

    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter(v => String(v.title || "").toLowerCase().includes(q) || String(v.id || "").toLowerCase().includes(q));
    }

    // ★ 念のための安全装置：万が一 page と count が逆転して送られてきても強制補正する
    let safeCount = Math.max(1, count);
    let safePage = Math.max(1, page);
    if (safePage > 10 && safeCount < 5) {
        const tmp = safePage; safePage = safeCount; safeCount = tmp;
    }

    const start = (safePage - 1) * safeCount;
    if (isRankingMode) return filtered.slice(start, start + safeCount);
    
    return shuffleWithSeed(filtered, seed).slice(start, start + safeCount);
  } catch (e) {
    console.error("Redis Error:", e);
    return [];
  }
}