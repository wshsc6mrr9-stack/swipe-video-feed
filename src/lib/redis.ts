import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function getFilteredVideos(genres: string[] = [], query: string = "", count: number = 50): Promise<any[]> {
  try {
    const isAll = genres.length === 0 || genres.includes("all") || genres.includes("likes");
    const hasQuery = query.trim().length > 0;

    // 🌟 修正1: 検索なし（トップ画面）の場合は「高速ランダム取得」に戻し、制限オーバーを回避
    if (isAll && !hasQuery) {
      const total = await redis.llen("videos");
      if (total === 0) return [];
      const maxStartIndex = Math.max(0, total - count);
      const start = Math.floor(Math.random() * maxStartIndex);
      const rows = await redis.lrange("videos", start, start + count - 1);
      const videos = rows.map((r) => {
        try { return typeof r === "string" ? JSON.parse(r) : r; } catch { return null; }
      }).filter(Boolean);
      return videos.sort(() => Math.random() - 0.5);
    }

    // 🌟 修正2: 検索・ジャンル絞り込み時は、エラーを防ぐため「最新の3000件」の中で検索する
    const total = await redis.llen("videos");
    // 全件数が3000より多ければ「後ろから3000件(-3000)」、少なければ最初から(0)
    const fetchStart = total > 3000 ? -3000 : 0; 
    
    const rows = await redis.lrange("videos", fetchStart, -1);
    let videos = rows.map((r) => {
      try { return typeof r === "string" ? JSON.parse(r) : r; } catch { return null; }
    }).filter(Boolean);

    // ジャンルで絞り込み
    if (!isAll) {
      const want = new Set(genres);
      videos = videos.filter((v: any) => {
        const tags = Array.isArray(v.genres) ? v.genres : (typeof v.genre === "string" ? [v.genre] : []);
        return tags.some((t: any) => want.has(String(t)));
      });
    }

    // 検索キーワードで絞り込み
    if (hasQuery) {
      const q = query.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
      videos = videos.filter((v: any) => {
        const title = String(v.title || "").normalize("NFKC").toLowerCase();
        const affLabel = String(v.affLabel || v.affiliateLabel || "").normalize("NFKC").toLowerCase();
        return title.includes(q) || affLabel.includes(q);
      });
    }

    // 見つかった中からランダムに指定件数（50件）だけ返す
    return videos.sort(() => Math.random() - 0.5).slice(0, count);
  } catch (e) {
    console.error("Redis fetch error:", e);
    return [];
  }
}