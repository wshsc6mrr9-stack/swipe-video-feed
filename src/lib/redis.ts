// src/lib/redis.ts
import { Redis } from "@upstash/redis";
import { GENRE_SEO_MAP, type GenreKey } from "./genres";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export const KEY_PREFIX = "v:";
const RANKING_KEY = "video_ranking_v1";

export async function getFilteredVideos(
  genres: string[] = [],
  query: string = "",
  page: number = 1,
  limit: number = 15,
  seed: number = 0,
  ids: string[] = []
) {
  // 1. 全動画のキーを取得
  let keys = await redis.keys(`${KEY_PREFIX}*`);
  if (!keys.length) return [];

  // 2. データを一括取得
  const p = redis.pipeline();
  keys.forEach((k) => p.get(k));
  const results = await p.exec();
  let allVideos = results.filter(Boolean) as any[];

  // 3. ID指定がある場合（お気に入りなど）
  if (ids.length > 0) {
    const idSet = new Set(ids.map(String));
    allVideos = allVideos.filter((v) => idSet.has(String(v.id)));
  }

  // 4. ジャンルフィルタリング（★ 英語IDを日本語ラベルに紐付けて強化 ★）
  if (genres.length > 0 && !genres.includes("all")) {
    const searchTerms = new Set<string>();
    
    genres.forEach(g => {
      const lowerG = g.toLowerCase();
      searchTerms.add(lowerG);
      
      // GENRE_SEO_MAPから日本語のラベル（例: "ギャル"）を取得して検索候補に入れる
      const seoInfo = GENRE_SEO_MAP[g as GenreKey];
      if (seoInfo?.label) {
        searchTerms.add(seoInfo.label.toLowerCase());
      }
    });

    allVideos = allVideos.filter((v) => {
      const vGenres = (Array.isArray(v.genres) ? v.genres : [v.genre])
        .filter(Boolean)
        .map((s: string) => s.toLowerCase());
      
      // 動画のタグに、検索キーワードのいずれかが含まれていればヒット
      return vGenres.some((vg: string) => searchTerms.has(vg));
    });
  }

  // 5. キーワード検索
  if (query) {
    const q = query.toLowerCase();
    allVideos = allVideos.filter(
      (v) =>
        v.title?.toLowerCase().includes(q) ||
        v.id?.toLowerCase().includes(q)
    );
  }

  // 6. シャッフル（seedを使用）
  const seededRandom = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };
  
  allVideos.sort((a, b) => {
    const rA = seededRandom(seed + Number(a.id.toString().substring(0,5)) || 0);
    const rB = seededRandom(seed + Number(b.id.toString().substring(0,5)) || 0);
    return rA - rB;
  });

  // 7. ページネーション
  const start = (page - 1) * limit;
  return allVideos.slice(start, start + limit);
}