// src/app/api/import/route.ts
import { NextResponse } from "next/server";

type ImportPayload = {
  source?: string;
  pageUrl?: string;
  title?: string;
  genres?: string[];
  affUrl?: string;
  affLabel?: string;
  videoUrl?: string;
  poster?: string;
  createdAt?: number;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function norm(s: unknown) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

function safeArray(xs: unknown) {
  if (!Array.isArray(xs)) return [];
  return xs.map((x) => norm(x)).filter(Boolean).slice(0, 30);
}

function bearer(req: Request) {
  const h = req.headers.get("authorization") || "";
  if (h.toLowerCase().startsWith("bearer ")) return h.slice(7).trim();
  return "";
}

// Upstash REST (fetchで叩く)
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

// 超軽量レート制限（IPごと）: 30秒で20件まで
async function rateLimit(ip: string) {
  const key = `rl:import:${ip}`;
  const incr = await upstash(["INCR", key]);
  const n = Number(incr?.result ?? 0);
  if (n === 1) {
    await upstash(["EXPIRE", key, "30"]);
  }
  if (n > 20) {
    return { ok: false, retryAfterSec: 30 };
  }
  return { ok: true, retryAfterSec: 0 };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: Request) {
  try {
    // 1) トークンチェック
    const need = (process.env.IMPORT_TOKEN || "").trim();
    if (!need) {
      return NextResponse.json(
        { ok: false, error: "IMPORT_TOKEN missing" },
        { status: 500, headers: corsHeaders }
      );
    }

    const got = bearer(req);
    if (!got || got !== need) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401, headers: corsHeaders }
      );
    }

    // 2) レート制限
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip")?.trim() ||
      "unknown";

    const rl = await rateLimit(ip);
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: "Too Many Requests" },
        {
          status: 429,
          headers: { ...corsHeaders, "Retry-After": String(rl.retryAfterSec) },
        }
      );
    }

    // 3) 入力
    const body = (await req.json().catch(() => null)) as ImportPayload | null;
    if (!body) {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON" },
        { status: 400, headers: corsHeaders }
      );
    }

    const pageUrl = norm(body.pageUrl);
    const title = norm(body.title);
    const videoUrl = norm(body.videoUrl);
    const affUrl = norm(body.affUrl);
    const genres = safeArray(body.genres);

    // 最低限のバリデーション
    if (!pageUrl || !title) {
      return NextResponse.json(
        { ok: false, error: "pageUrl/title required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 4) 保存（重複防止：pageUrlで一意）
    const id = Buffer.from(pageUrl).toString("base64url"); // URL -> 安定ID
    const key = `import:item:${id}`;
    const createdAt = Date.now();

    const payload: ImportPayload = {
      source: norm(body.source) || "fanza",
      pageUrl,
      title,
      genres,
      affUrl,
      affLabel: norm(body.affLabel) || "商品を見る",
      videoUrl,
      poster: norm(body.poster),
      createdAt,
    };

    // SETNX で重複を弾く（既にあれば更新しない）
    const setnx = await upstash(["SETNX", key, JSON.stringify(payload)]);
    const inserted = Number(setnx?.result ?? 0) === 1;

    if (inserted) {
      // 一覧用に ZSET に追加（新しい順）
      await upstash(["ZADD", "import:queue", String(createdAt), id]);
    }

    return NextResponse.json(
      { ok: true, inserted, id, title },
      { status: 200, headers: corsHeaders }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500, headers: corsHeaders }
    );
  }
}
