// src/lib/redis.ts
import { Redis } from "@upstash/redis";
import { GENRE_SEO_MAP, type GenreKey } from "./genres";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

export const KEY_PREFIX = "v:";

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

  // 2. データを取得
  const p = redis.pipeline();
  keys.forEach((k) => p.get(k));
  const results = await p.exec();
  let allVideos = results.filter(Boolean) as any[];

  // 3. ID指定がある場合（特定の動画表示）
  if (ids.length > 0) {
    const idSet = new Set(ids.map(String));
    allVideos = allVideos.filter((v) => idSet.has(String(v.id)));
  }

  // 4. ジャンルフィルタリング
  // 「すべて(all)」が含まれているか、ジャンル指定が空ならフィルタリングをスキップ
  const isAll = genres.length === 0 || genres.some(g => g.toLowerCase() === 'all' || g === 'GENRE_ALL');

  if (!isAll) {
    const searchTerms = new Set<string>();
    genres.forEach(g => {
      if (!g) return;
      searchTerms.add(g.toLowerCase());
      // 英語IDから日本語ラベルを取得して追加
      const seoInfo = GENRE_SEO_MAP[g as GenreKey];
      if (seoInfo?.label) searchTerms.add(seoInfo.label.toLowerCase());
    });

    allVideos = allVideos.filter((v) => {
      // 全てのジャンル項目（genres配列、単体genre、category）をチェック
      const vGenres = [
        ...(Array.isArray(v.genres) ? v.genres : []),
        v.genre,
        v.category
      ].filter(Boolean).map(s => String(s).toLowerCase());
      
      return vGenres.some(vg => searchTerms.has(vg));
    });
  }

  // 5. 検索
  if (query) {
    const q = query.toLowerCase();
    allVideos = allVideos.filter(v => 
      String(v.title || "").toLowerCase().includes(q) || 
      String(v.id || "").toLowerCase().includes(q)
    );
  }

  // 6. シャッフル
  const seededRandom = (s: number) => {
    const x = Math.sin(s) * 10000;
    return x - Math.floor(x);
  };
  allVideos.sort((a, b) => {
    const rA = seededRandom(seed + Number(String(a.id).substring(0, 5) || 0));
    const rB = seededRandom(seed + Number(String(b.id).substring(0, 5) || 0));
    return rA - rB;
  });

  // 7. ページネーション
  const start = (page - 1) * limit;
  return allVideos.slice(start, start + limit);
}