import { Redis } from "@upstash/redis";
import { unstable_cache } from "next/cache"; // ★追加: Next.jsの強力なキャッシュ機能

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const RANKING_KEY = "video:ranking";

// シード値を用いた乱数生成
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

// ★ 高速化のキモ: 全動画データの取得をNext.js側でキャッシュする
// これにより、APIが呼ばれるたびにRedisへ大量の通信が走るのを防ぎます
const getAllVideosCached = unstable_cache(
  async () => {
    try {
      const total = await redis.llen("videos");
      if (total === 0) return [];

      const CHUNK_SIZE = 1000;
      const promises = [];
      for (let i = 0; i < total; i += CHUNK_SIZE) {
        const end = Math.min(i + CHUNK_SIZE - 1, total - 1);
        promises.push(redis.lrange("videos", i, end));
      }
      const chunkedResults = await Promise.all(promises);
      
      const allVideos = chunkedResults.flat().map((r) => {
        try { return typeof r === "string" ? JSON.parse(r) : r; } catch { return null; }
      }).filter(Boolean);

      return allVideos;
    } catch (e) {
      console.error("Redis fetch error inside cache:", e);
      return [];
    }
  },
  ["all-videos-cache-v1"], // キャッシュキー（バージョンを変えれば強制更新可能）
  { revalidate: 300 }      // 300秒（5分）間は再利用する
);

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
    
    // ★ キャッシュされた全データを取得（爆速化）
    let allVideos = await getAllVideosCached();
    
    // エラー等で取れなかった場合のフォールバック（念のため）
    if (!allVideos || allVideos.length === 0) {
       // キャッシュが空なら直接取りに行く（緊急回避）
       const total = await redis.llen("videos");
       if (total > 0) {
         const raw = await redis.lrange("videos", 0, 2000); // 重いので最新2000件に制限
         allVideos = raw.map(r => typeof r === "string" ? JSON.parse(r) : r).filter(Boolean);
       }
    }

    let filtered = allVideos;

    // --- モード別の処理 ---

    // 1. お気に入りモード
    if (isFavoritesMode) {
      const idSet = new Set(targetIds);
      // ここはID検索なので、全件から探す必要がある
      filtered = filtered.filter((v: any) => idSet.has(String(v.id)));
      
      // 指定されたID順（targetIdsの順番）に並べ替える
      // （※localStorageから渡された順序を維持したい場合）
      // もしランダムで良ければこのソートは不要
      const sortMap = new Map(targetIds!.map((id, i) => [id, i]));
      filtered.sort((a: any, b: any) => {
        return (sortMap.get(String(a.id)) ?? 9999) - (sortMap.get(String(b.id)) ?? 9999);
      });
    }
    // 2. ランキングモード
    else if (isRankingMode) {
      // Redisからランキング順序を取得
      const rankedIds = await redis.zrange(RANKING_KEY, 0, 2000, { rev: true });
      const rankMap = new Map<string, number>();
      rankedIds.forEach((id: unknown, idx: number) => {
        rankMap.set(String(id), idx);
      });
      
      // ランキングに含まれる動画を優先し、順位順に並べる
      // （ランキング外の動画は末尾に回すか、除外するかはお好みで。ここは全動画をランク順に並べるロジック）
      filtered.sort((a: any, b: any) => {
        const idA = String(a.id);
        const idB = String(b.id);
        const rankA = rankMap.has(idA) ? rankMap.get(idA)! : 999999;
        const rankB = rankMap.has(idB) ? rankMap.get(idB)! : 999999;
        return rankA - rankB;
      });
    }
    // 3. 通常/ジャンルモード
    else if (!isAll) {
      const want = new Set(genres);
      filtered = filtered.filter((v: any) => {
        const tags = Array.isArray(v.genres) ? v.genres : (typeof v.genre === "string" ? [v.genre] : []);
        return tags.some((t: any) => want.has(String(t)));
      });
    }

    // --- キーワード検索 (共通) ---
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

    // --- ページングと返却 ---
    const startIndex = (page - 1) * count;

    // ランキングとお気に入りはシャッフルしない（順序が重要）
    if (isRankingMode || isFavoritesMode) {
      return filtered.slice(startIndex, Math.min(startIndex + count, filtered.length));
    } 
    
    // 通常モードはシード値で完全シャッフル
    const shuffled = shuffleWithSeed(filtered, seed);
    return shuffled.slice(startIndex, Math.min(startIndex + count, shuffled.length));

  } catch (e) {
    console.error("Redis fetch error:", e);
    return [];
  }
}