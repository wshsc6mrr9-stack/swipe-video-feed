// src/app/api/import/list/route.ts
import { NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

async function upstash(cmd: string[]) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Missing Upstash env");
  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`Upstash error: ${r.status} ${t}`);
  }
  return r.json();
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const limit = Math.min(Math.max(Number(u.searchParams.get("limit") || 50), 1), 200);

    // 新しい順にIDを取得
    const idsRes = await upstash(["ZREVRANGE", "import:queue", "0", String(limit - 1)]);
    const ids: string[] = idsRes?.result || [];

    const items: any[] = [];
    for (const id of ids) {
      const key = `import:item:${id}`;
      const v = await upstash(["GET", key]);
      const raw = v?.result;
      if (!raw) continue;
      try {
        items.push({ id, ...JSON.parse(raw) });
      } catch {
        // ignore broken json
      }
    }

    return NextResponse.json({ ok: true, items }, { status: 200, headers: corsHeaders });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500, headers: corsHeaders }
    );
  }
}
