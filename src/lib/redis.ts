// src/lib/redis.ts
import { Redis } from "@upstash/redis";
import { GENRE_SEO_MAP, type GenreKey } from "./genres";

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

// ★ 引数の定義を route.ts と完全に一致させる
export async function getFilteredVideos(
  genres: string[] = [], 
  query: string = "", 
  page: number = 1,
  limit: number = 10,
  seed: number = 0,
  targetIds?: string[]
): Promise<any[]> {
  try {
    const isFavoritesMode = targetIds && targetIds.length > 0;
    const isRankingMode = !isFavoritesMode && (genres.includes("__likes__") || genres.includes("likes"));
    
    // ★ 修正：全件表示の条件を「指定なし」または「all/GENRE_ALL」が含まれる場合に拡大
    const isAll = !isFavoritesMode && !isRankingMode && (
      genres.length === 0 || 
      genres.some(g => ["all", "GENRE_ALL", "ランダム"].includes(String(g)))
    );
    
    // 1. 全データ取得（キャッシュ or Redis）
    const now = Date.now();
    let allVideos = [];

    if (allVideosCache && (now - cacheTimestamp < CACHE_TTL)) {
      allVideos = allVideosCache;
    } else {
      const total = await redis.llen("videos");
      if (total === 0) return []; // データが無い場合は空配列

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

    // 2. フィルタリング実行
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
      // ★ 修正：検索ワードを整理
      const searchTerms = new Set<string>();
      genres.forEach(g => {
        const key = String(g).trim();
        searchTerms.add(key); // そのままの文字（例：美少女）
        
        // SEOマップにあればラベルも追加（念のため）
        const seoEntry = GENRE_SEO_MAP[key as GenreKey];
        if (seoEntry?.label) searchTerms.add(seoEntry.label);
      });

      filtered = filtered.filter((v: any) => {
        // 動画のタグをすべて取得して文字列化
        const videoTags = [
          ...(Array.isArray(v.genres) ? v.genres : []),
          v.genre,
          v.category
        ].filter(Boolean).map(String);
        
        // 動画タグの中に、検索ワードが含まれているか（部分一致も許容するとヒット率が上がるが、一旦は完全一致でSet検索）
        return videoTags.some(t => searchTerms.has(t));
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

    // 4. ページネーション & シャッフル
    const start = (page - 1) * limit;
    
    if (isRankingMode) {
      return filtered.slice(start, start + limit);
    } 
    
    // シード値を使って並び替え
    const shuffled = shuffleWithSeed(filtered, seed);
    return shuffled.slice(start, start + limit);

  } catch (e) {
    console.error("Redis Error:", e);
    return [];
  }
}