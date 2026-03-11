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

function toSafeNumber(value: unknown): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function normalizeVideo(raw: any) {
  const duration =
    toSafeNumber(raw?.duration) ??
    toSafeNumber(raw?.videoDuration) ??
    toSafeNumber(raw?.totalDuration) ??
    toSafeNumber(raw?.lengthSec) ??
    toSafeNumber(raw?.durationSec) ??
    toSafeNumber(raw?.movieDuration) ??
    toSafeNumber(raw?.playTime) ??
    toSafeNumber(raw?.seconds) ??
    undefined;

  return {
    ...raw,
    id: String(raw?.id ?? ""),
    title: String(raw?.title ?? ""),
    url: raw?.url ?? raw?.src ?? "",
    src: raw?.src ?? raw?.url ?? "",
    poster: raw?.poster ?? "",
    srcType: raw?.srcType ?? undefined,
    affUrl: raw?.affUrl ?? raw?.affiliateUrl ?? "",
    affLabel: raw?.affLabel ?? raw?.affiliateLabel ?? "",
    affiliateUrl: raw?.affiliateUrl ?? raw?.affUrl ?? "",
    affiliateLabel: raw?.affiliateLabel ?? raw?.affLabel ?? "",
    genres: Array.isArray(raw?.genres) ? raw.genres : [],
    genre: typeof raw?.genre === "string" ? raw.genre : "",
    likeCount: Number(raw?.likeCount ?? 0),
    duration,
  };
}

// ===== getFilteredVideos（最終・実データ耐性MAX） =====
export async function getFilteredVideos(
  genres: string[] | undefined,
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
        .filter(Boolean)
        .map(normalizeVideo)
        .filter((v) => !!v.id);

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

    // ---- genre filter（ジャンル無し動画は除外しない） ----
    } else if (!isAll && Array.isArray(genres) && genres.length > 0) {
      const want = genres.map((g) =>
        String(g).normalize("NFKC").trim()
      );

      filtered = filtered.filter((v: any) => {
        const candidates: string[] = [];

        if (Array.isArray(v.genres)) candidates.push(...v.genres);
        if (typeof v.genre === "string") candidates.push(v.genre);
        if (Array.isArray(v.tags)) candidates.push(...v.tags);
        if (typeof v.tag === "string") candidates.push(v.tag);
        if (typeof v.category === "string") candidates.push(v.category);
        if (Array.isArray(v.categories)) candidates.push(...v.categories);

        // ★ ジャンル情報が無い動画は「通す」
        if (candidates.length === 0) return true;

        return candidates.some((c) => {
          const tag = String(c).normalize("NFKC").trim();
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