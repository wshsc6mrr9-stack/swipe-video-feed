// ===== src/lib/redis.ts =====
import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

let allVideosCache: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 1000 * 60 * 5;
const RANKING_KEY = "video:ranking";

// ---- seeded shuffle ----
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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

// ===== getFilteredVideos（最終版） =====
export async function getFilteredVideos(
  genres: string[] | undefined, // ★ undefined = 全件モード
  query: string = "",
  count: number = 50,
  page: number = 1,
  seed: number = 0,
  targetIds?: string[]
): Promise<any[]> {
  try {
    const isFavoritesMode = Array.isArray(targetIds) && targetIds.length > 0;
    const isRankingMode =
      !isFavoritesMode &&
      Array.isArray(genres) &&
      (genres.includes("__likes__") || genres.includes("likes"));

    // ★ 全件表示の判定（空配列や未指定は全件）
    const isAll =
      !isFavoritesMode &&
      !isRankingMode &&
      (!genres || genres.length === 0);

    const hasQuery = query.trim().length > 0;

    // ---- load cache / redis ----
    const now = Date.now();
    let allVideos: any[] = [];

    if (allVideosCache && now - cacheTimestamp < CACHE_TTL) {
      allVideos = allVideosCache;
    } else {
      const total = await redis.llen("videos");
      if (total === 0) return [];

      const CHUNK_SIZE = 1000;
      const promises: Promise<any[]>[] = [];
      for (let i = 0; i < total; i += CHUNK_SIZE) {
        const end = Math.min(i + CHUNK_SIZE - 1, total - 1);
        promises.push(redis.lrange("videos", i, end));
      }

      const chunkedResults = await Promise.all(promises);
      allVideos = chunkedResults
        .flat()
        .map((r) => {
          try {
            return typeof r === "string" ? JSON.parse(r) : r;
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      allVideosCache = allVideos;
      cacheTimestamp = now;
    }

    let filtered = allVideos;

    // ---- favorites ----
    if (isFavoritesMode) {
      const idSet = new Set(targetIds!.map(String));
      filtered = filtered.filter((v) => idSet.has(String(v.id)));

      // ---- ranking ----
    } else if (isRankingMode) {
      const rankedIds = await redis.zrange(RANKING_KEY, 0, 2000, { rev: true });
      const rankMap = new Map<string, number>();
      rankedIds.forEach((id: unknown, idx: number) =>
        rankMap.set(String(id), idx)
      );

      filtered = [...filtered].sort((a: any, b: any) => {
        const ra = rankMap.get(String(a.id)) ?? 999999;
        const rb = rankMap.get(String(b.id)) ?? 999999;
        return ra - rb;
      });

      // ---- genre filter（部分一致・日本語耐性） ----
    } else if (!isAll && Array.isArray(genres) && genres.length > 0) {
      const want = genres.map((g) =>
        String(g).normalize("NFKC").trim()
      );

      filtered = filtered.filter((v: any) => {
        const tags = Array.isArray(v.genres)
          ? v.genres
          : typeof v.genre === "string"
          ? [v.genre]
          : [];

        return tags.some((t: any) => {
          const tag = String(t).normalize("NFKC").trim();
          return want.some((w) => tag.includes(w));
        });
      });
    }

    // ---- keyword search ----
    if (hasQuery) {
      const words = query
        .normalize("NFKC")
        .toLowerCase()
        .replace(/　/g, " ")
        .split(/\s+/)
        .filter(Boolean);

      filtered = filtered.filter((v: any) => {
        const text = (
          String(v.title || "") +
          " " +
          String(v.affLabel || v.affiliateLabel || "")
        )
          .normalize("NFKC")
          .toLowerCase();

        return words.every((w) => text.includes(w));
      });
    }

    // ---- page / count safety ----
    let safeCount = Math.max(1, count);
    let safePage = Math.max(1, page);
    if (safePage > 20 && safeCount < 5) {
      const tmp = safePage;
      safePage = safeCount;
      safeCount = tmp;
    }

    const startIndex = (safePage - 1) * safeCount;

    if (isRankingMode) {
      return filtered.slice(
        startIndex,
        Math.min(startIndex + safeCount, filtered.length)
      );
    }

    const shuffled = shuffleWithSeed(filtered, seed);
    return shuffled.slice(
      startIndex,
      Math.min(startIndex + safeCount, shuffled.length)
    );
  } catch (e) {
    console.error("Redis fetch error:", e);
    return [];
  }
}