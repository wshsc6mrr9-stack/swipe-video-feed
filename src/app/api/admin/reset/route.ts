import { NextResponse } from "next/server";
import { redis } from "@/lib/upstash";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const pass = url.searchParams.get("pass");

  // セキュリティのため合言葉が必要（あなたのADMIN_PASSWORD）
  if (pass !== "mdoskldmnvopdkmfjsps6hd9hs9hd0d") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 物理削除！これで形式の衝突が解消されます
  await redis.del("videos:all");

  return NextResponse.json({ ok: true, message: "Redis reset successful. Now you can import!" });
}