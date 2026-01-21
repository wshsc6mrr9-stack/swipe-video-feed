// app/api/admin/login/route.ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_PASSWORD is not set" },
      { status: 500 }
    );
  }

  if (password !== expected) {
    return NextResponse.json(
      { ok: false, error: "invalid password" },
      { status: 401 }
    );
  }

  // ✅ Cookie 付与
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: "admin_auth",
    value: "1",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return res;
}
