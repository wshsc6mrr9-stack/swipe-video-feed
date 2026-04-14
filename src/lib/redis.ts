import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// ---- in-process cache（同一インスタンス内で有効） ----
let allVideosCache: any[] | null = null;
let cacheTimestamp = 0;
const IN_PROCESS_CACHE_TTL = 1000 * 60 * 2; // 2分

// ---- Redis上のキャッシュキー（コールドスタート対策） ----
const REDIS_CACHE_KEY = "videos:cache:normalized:v2";
const REDIS_CACHE_TTL_SEC = 60 * 5; // 5分

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

/**
 * 全動画リストを取得する。
 * 優先順位：① in-process cache → ② Redis cache → ③ Redis lrange（全件フェッチ）
 * コールドスタート時でも ② で 1回の GET に収まる。
 */
async function loadAllVideos(): Promise<any[]> {
  const now = Date.now();

  // ① in-process cache（同じサーバーレスインスタンス内なら最速）
  if (allVideosCache && now - cacheTimestamp < IN_PROCESS_CACHE_TTL) {
    return allVideosCache;
  }

  // ② Redis cache（コールドスタート後の1発目も高速）
  try {
    const cached = await redis.get<string>(REDIS_CACHE_KEY);
    if (cached) {
      const parsed: any[] = typeof cached === "string" ? JSON.parse(cached) : cached;
      if (Array.isArray(parsed) && parsed.length > 0) {
        allVideosCache = parsed;
        cacheTimestamp = now;
        return parsed;
      }
    }
  } catch {
    // Redis cache miss はフォールスルーする
  }

  // ③ 全件フェッチ（キャッシュが完全に切れた場合のみ）
  const total = await redis.llen("videos");
  if (total === 0) return [];

  const CHUNK_SIZE = 1000;
  const promises: Promise<any[]>[] = [];
  for (let i = 0; i < total; i += CHUNK_SIZE) {
    promises.push(redis.lrange("videos", i, Math.min(i + CHUNK_SIZE - 1, total - 1)));
  }

  const chunks = await Promise.all(promises);
  const allVideos = chunks
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

  // in-process cache を更新
  allVideosCache = allVideos;
  cacheTimestamp = now;

  // Redis cache も非同期で更新（レスポンスをブロックしない）
  redis
    .set(REDIS_CACHE_KEY, JSON.stringify(allVideos), { ex: REDIS_CACHE_TTL_SEC })
    .catch(() => {});

  return allVideos;
}

/** Redis cache を強制クリアする（動画追加・削除時に呼ぶ） */
export async function invalidateVideosCache(): Promise<void> {
  allVideosCache = null;
  cacheTimestamp = 0;
  await redis.del(REDIS_CACHE_KEY).catch(() => {});
}

/**
 * 高速パス: 全件ロード不要なオフセット直接ページング
 * GENRE_ALL + no query の通常フィード用。
 * llen(1回) + lrange(1〜2回) = 最大2回のRedis呼び出しで完結。
 *
 * ページ間のオーバーラップを完全に排除するため、
 * ページごとに count ずつ非重複で進む設計。
 * seed が起点をランダム化するため、セッションごとに異なるコンテンツを提供。
 */
/**
 * 完全ランダムページング
 *
 * 旧実装: baseOffset + pageOffset で連続ブロックを読む
 *   → DBの保存順（同ソース・同ジャンルが固まる）がそのまま出てしまう
 *
 * 新実装: seed + page を組み合わせた独立シードで count 個のランダムインデックスを生成し
 *   Upstash pipeline で一括取得（llen 1回 + pipeline 1回 = 2 HTTPリクエスト）
 *   → 全 144K 件から均等サンプリング、ページ間でも相関なし
 */
async function getFeedPageDirect(
  count: number,
  page: number,
  seed: number
): Promise<any[]> {
  const total = await redis.llen("videos");
  if (total === 0) return [];

  // page ごとに独立したシードを生成（ページ間の相関をなくす）
  // ビット演算で 32bit 整数に収める
  const pageSeed = (seed * 1000003 + page * 2654435761) | 0;
  const rng = mulberry32(pageSeed >>> 0); // 符号なし32bit に正規化

  // count 個の重複なしランダムインデックスを生成
  const indexSet = new Set<number>();
  let safetyLimit = count * 10;
  while (indexSet.size < count && safetyLimit-- > 0) {
    indexSet.add(Math.floor(rng() * total));
  }
  const randomIndices = Array.from(indexSet);

  // Upstash pipeline: 全 lindex を 1 HTTP リクエストで一括送信
  const pipe = redis.pipeline();
  for (const idx of randomIndices) {
    pipe.lindex("videos", idx);
  }
  const results = (await pipe.exec()) as (string | null)[];

  return results
    .filter(Boolean)
    .map((r) => {
      try { return typeof r === "string" ? JSON.parse(r) : r; }
      catch { return null; }
    })
    .filter(Boolean)
    .map(normalizeVideo)
    .filter((v) => !!v.id);
}

// ===== getFilteredVideos =====
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

    // ---- 高速パス: GENRE_ALL + 検索なし → loadAllVideos() を完全スキップ ----
    if (isAll && !hasQuery) {
      const safeCount = Math.max(1, count);
      const safePage  = Math.max(1, page);
      return getFeedPageDirect(safeCount, safePage, seed);
    }

    const allVideos = await loadAllVideos();
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
      const want = genres.map((g) => String(g).normalize("NFKC").trim());

      filtered = filtered.filter((v: any) => {
        const candidates: string[] = [];
        if (Array.isArray(v.genres)) candidates.push(...v.genres);
        if (typeof v.genre === "string") candidates.push(v.genre);
        if (Array.isArray(v.tags)) candidates.push(...v.tags);
        if (typeof v.tag === "string") candidates.push(v.tag);
        if (typeof v.category === "string") candidates.push(v.category);
        if (Array.isArray(v.categories)) candidates.push(...v.categories);

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
      return filtered.slice(startIndex, startIndex + safeCount);
    }

    const shuffled = shuffleWithSeed(filtered, seed);
    return shuffled.slice(startIndex, startIndex + safeCount);
  } catch (e) {
    console.error("Redis fetch error:", e);
    return [];
  }
}