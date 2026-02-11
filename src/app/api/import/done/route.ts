// src/app/api/import/done/route.ts
import { NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function bearer(req: Request) {
  const h = req.headers.get("authorization") || "";
  if (h.toLowerCase().startsWith("bearer ")) return h.slice(7).trim();
  return "";
}

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

export async function POST(req: Request) {
  try {
    // 追加：done は第三者に消されると困るので token 必須にする
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

    const body = (await req.json().catch(() => null)) as { id?: string } | null;
    const id = String(body?.id || "").trim();
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id required" },
        { status: 400, headers: corsHeaders }
      );
    }

    await upstash(["ZREM", "import:queue", id]);
    await upstash(["DEL", `import:item:${id}`]);

    return NextResponse.json({ ok: true }, { status: 200, headers: corsHeaders });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500, headers: corsHeaders }
    );
  }
}
