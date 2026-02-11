import { NextResponse } from "next/server";
import { upstash } from "../../../../../lib/upstash";

const corsHeaders: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization, x-admin-password",
};

function auth(req: Request) {
  const need = (process.env.ADMIN_PASSWORD || "").trim();
  if (!need) return false;
  const got = (req.headers.get("x-admin-password") || "").trim();
  return got === need;
}

export async function OPTIONS() {
  return NextResponse.json({ ok: true }, { headers: corsHeaders });
}

export async function GET(req: Request) {
  if (!auth(req)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: corsHeaders }
    );
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(200, Number(searchParams.get("limit") || "50")));

  try {
    const items = await upstash.getImportQueue(limit);
    return NextResponse.json({ ok: true, items }, { headers: corsHeaders });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500, headers: corsHeaders }
    );
  }
}
