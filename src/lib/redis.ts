import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function getFilteredVideos(genres: string[] = [], query: string = "", count: number = 50): Promise<any[]> {
  try {
    // 1. データベースの全動画を取得する
    const rows = await redis.lrange("videos", 0, -1);
    let videos = rows.map((r) => {
      try { return typeof r === "string" ? JSON.parse(r) : r; } catch { return null; }
    }).filter(Boolean);

    // 2. ジャンルで全件から絞り込み（allやlikes以外が選ばれている場合）
    if (genres.length > 0 && !genres.includes("all") && !genres.includes("likes")) {
      const want = new Set(genres);
      videos = videos.filter((v: any) => {
        const tags = Array.isArray(v.genres) ? v.genres : (typeof v.genre === "string" ? [v.genre] : []);
        // 👇 ここに型 (t: any) を追加してエラーを解消
        return tags.some((t: any) => want.has(String(t)));
      });
    }

    // 3. 検索キーワードで全件から絞り込み
    if (query) {
      const q = query.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
      // 👇 ここも念のため (v: any) にしてエラー防止
      videos = videos.filter((v: any) => {
        const title = String(v.title || "").normalize("NFKC").toLowerCase();
        const affLabel = String(v.affLabel || v.affiliateLabel || "").normalize("NFKC").toLowerCase();
        return title.includes(q) || affLabel.includes(q);
      });
    }

    // 4. 絞り込んだ中からランダムに並び替えて指定件数（50件）だけ返す
    return videos.sort(() => Math.random() - 0.5).slice(0, count);
  } catch (e) {
    console.error("Redis fetch error:", e);
    return [];
  }
}