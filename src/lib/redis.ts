import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function getFilteredVideos(genres: string[] = [], query: string = "", count: number = 50): Promise<any[]> {
  try {
    const isAll = genres.length === 0 || genres.includes("all") || genres.includes("likes");
    const hasQuery = query.trim().length > 0;
    const total = await redis.llen("videos");
    
    if (total === 0) return [];

    // 🌟 検索なし（トップ画面）は高速表示を優先して一部からランダム取得
    if (isAll && !hasQuery) {
      const scanLimit = 2000;
      const maxStartIndex = Math.max(0, Math.min(total, scanLimit) - count);
      const start = Math.floor(Math.random() * maxStartIndex);
      const rows = await redis.lrange("videos", start, start + count - 1);
      const videos = rows.map((r) => {
        try { return typeof r === "string" ? JSON.parse(r) : r; } catch { return null; }
      }).filter(Boolean);
      return videos.sort(() => Math.random() - 0.5);
    }

    // 🌟 検索・ジャンル絞り込み（100%全動画を対象）
    // 通信量制限（1MBエラー）を回避するため、1000件ずつ「小分け」にして全件を調べ尽くします
    const CHUNK_SIZE = 1000;
    let matchedVideos: any[] = [];
    const want = new Set(genres);
    const q = hasQuery ? query.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim() : "";

    // 0件目から最後まで、CHUNK_SIZEずつズラしながら全件取得ループ
    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const end = Math.min(i + CHUNK_SIZE - 1, total - 1);
      const rows = await redis.lrange("videos", i, end);
      
      let chunkVideos = rows.map((r) => {
        try { return typeof r === "string" ? JSON.parse(r) : r; } catch { return null; }
      }).filter(Boolean);

      // その1000件の中でジャンル絞り込み
      if (!isAll) {
        chunkVideos = chunkVideos.filter((v: any) => {
          const tags = Array.isArray(v.genres) ? v.genres : (typeof v.genre === "string" ? [v.genre] : []);
          return tags.some((t: any) => want.has(String(t)));
        });
      }

      // その1000件の中でキーワード絞り込み
      if (hasQuery) {
        chunkVideos = chunkVideos.filter((v: any) => {
          const title = String(v.title || "").normalize("NFKC").toLowerCase();
          const affLabel = String(v.affLabel || v.affiliateLabel || "").normalize("NFKC").toLowerCase();
          return title.includes(q) || affLabel.includes(q);
        });
      }

      // 見つかった動画を「かき集め用配列」に追加
      matchedVideos.push(...chunkVideos);
    }

    // 全動画の中から見つかった対象をランダムに並び替えて、指定件数（50件）返す
    return matchedVideos.sort(() => Math.random() - 0.5).slice(0, count);
  } catch (e) {
    console.error("Redis fetch error:", e);
    return [];
  }
}