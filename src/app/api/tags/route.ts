import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

export const dynamic = "force-dynamic";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function GET() {
  try {
    // タイムアウト対策として、最新の20000件の動画からタグをサンプリング調査します
    const SAMPLE_SIZE = 20000;
    const total = await redis.llen("videos");
    const fetchCount = Math.min(total, SAMPLE_SIZE);
    
    const CHUNK_SIZE = 1000;
    const promises = [];
    for (let i = 0; i < fetchCount; i += CHUNK_SIZE) {
      const end = Math.min(i + CHUNK_SIZE - 1, fetchCount - 1);
      promises.push(redis.lrange("videos", i, end));
    }
    const chunkedResults = await Promise.all(promises);
    
    const allVideos = chunkedResults.flat().map((r) => {
      try { return typeof r === "string" ? JSON.parse(r) : r; } catch { return null; }
    }).filter(Boolean);

    // タグの集計処理
    const tagCounts: Record<string, number> = {};

    allVideos.forEach(v => {
      const tags = [
        ...(Array.isArray(v.genres) ? v.genres : []),
        v.genre,
        v.category
      ].filter(Boolean).map(t => String(t).trim()); // ★あえて小文字化せず、DBの生データをそのまま集計

      tags.forEach(t => {
        if (!t) return;
        tagCounts[t] = (tagCounts[t] || 0) + 1;
      });
    });

    // 出現回数が多い順に並び替え
    const sortedTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      message: `DB内の全動画数: ${total}件 / 今回調査した動画数: ${allVideos.length}件`,
      total_unique_tags: sortedTags.length,
      tags: sortedTags
    });

  } catch (error) {
    console.error("Tags API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}