import { NextResponse } from "next/server";
import { upstash } from "../../../../../lib/upstash";

const corsHeaders: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST,OPTIONS",
  "access-control-allow-headers": "Content-Type, Authorization, x-admin-password",
};

function auth(req: Request) {
  const need = (process.env.ADMIN_PASSWORD || "").trim();
  if (!need) return false;
  const got = (req.headers.get("x-admin-password") || "").trim();
  return got === need;
}

export async function OPTIONS() {
  return NextResponse.json({ ok: true }, { status: 200, headers: corsHeaders });
}

export async function POST(req: Request) {
  if (!auth(req)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const body = await req.json();
    const id = String(body?.id || "").trim();
    if (!id) {
      return NextResponse.json(
        { ok: false, error: "id required" },
        { status: 400, headers: corsHeaders }
      );
    }

    await upstash.doneImport(id);

    return NextResponse.json(
      { ok: true },
      { status: 200, headers: corsHeaders }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e) },
      { status: 500, headers: corsHeaders }
    );
  }
}
