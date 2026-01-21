// src/app/api/admin/login/route.ts
import { NextResponse } from "next/server";

const COOKIE_NAME = "admin_auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword || !adminPassword.trim()) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_PASSWORD is not set on server" },
      { status: 500 }
    );
  }

  if (password !== adminPassword) {
    return NextResponse.json({ ok: false, error: "invalid password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  // ✅ ローカル(http)では secure=false / 本番(https)では secure=true
  const secure = process.env.NODE_ENV === "production";

  res.cookies.set({
    name: COOKIE_NAME,
    value: "1",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7日
  });

  res.headers.set("Cache-Control", "no-store");
  return res;
}
