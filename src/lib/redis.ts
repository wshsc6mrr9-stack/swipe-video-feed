import { Redis } from "@upstash/redis";

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function getFilteredVideos(genres: string[] = [], query: string = "", count: number = 50): Promise<any[]> {
  try {
    const isAll = genres.length === 0 || genres.includes("all") || genres.includes("likes");
    const hasQuery = query.trim().length > 0;
    
    // まず全件数を取得
    const total = await redis.llen("videos");
    if (total === 0) return [];

    // 🌟 1. トップ画面（検索・絞り込みなし）の時は、高速化のため一部だけランダム取得
    if (isAll && !hasQuery) {
      const scanLimit = 2000; // 最新2000件からランダム
      const maxStartIndex = Math.max(0, Math.min(total, scanLimit) - count);
      const start = Math.floor(Math.random() * maxStartIndex);
      // ここは1回のリクエストで済むのでそのままでOK
      const rows = await redis.lrange("videos", start, start + count - 1);
      const videos = rows.map((r) => {
        try { return typeof r === "string" ? JSON.parse(r) : r; } catch { return null; }
      }).filter(Boolean);
      return videos.sort(() => Math.random() - 0.5);
    }

    // 🌟 2. 検索・絞り込み時（全件検索）
    // ループで「待って」しまわないよう、全てのリクエストを一斉に発射（Promise.all）します
    const CHUNK_SIZE = 1000;
    const promises = [];

    for (let i = 0; i < total; i += CHUNK_SIZE) {
      const end = Math.min(i + CHUNK_SIZE - 1, total - 1);
      // awaitせずに、リクエストの約束（Promise）だけを配列に詰め込む
      promises.push(redis.lrange("videos", i, end));
    }

    // ここで一気に全データを並列受信！ (直列の数倍速い)
    const chunkedResults = await Promise.all(promises);

    // 全ての結果を1つの配列に結合(flat)してパース
    let allVideos = chunkedResults.flat().map((r) => {
      try { return typeof r === "string" ? JSON.parse(r) : r; } catch { return null; }
    }).filter(Boolean);

    // ジャンル絞り込み
    if (!isAll) {
      const want = new Set(genres);
      allVideos = allVideos.filter((v: any) => {
        const tags = Array.isArray(v.genres) ? v.genres : (typeof v.genre === "string" ? [v.genre] : []);
        return tags.some((t: any) => want.has(String(t)));
      });
    }

    // キーワード検索
    if (hasQuery) {
      const q = query.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
      allVideos = allVideos.filter((v: any) => {
        const title = String(v.title || "").normalize("NFKC").toLowerCase();
        const affLabel = String(v.affLabel || v.affiliateLabel || "").normalize("NFKC").toLowerCase();
        return title.includes(q) || affLabel.includes(q);
      });
    }

    // ランダムにシャッフルして返す
    return allVideos.sort(() => Math.random() - 0.5).slice(0, count);

  } catch (e) {
    console.error("Redis fetch error:", e);
    // エラー時も空配列を返してアプリが落ちないようにする
    return [];
  }
}