// src/app/api/admin/login/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_PASSWORD is not set on server" },
      { status: 500 }
    );
  }

  if (password !== adminPassword) {
    return NextResponse.json({ ok: false, error: "invalid password" }, { status: 401 });
  }

  // ✅ Cookie 発行（これが無いとログイン状態にならない）
  const res = NextResponse.json({ ok: true });

  res.cookies.set({
    name: "admin_auth",
    value: "1",
    httpOnly: true,
    sameSite: "lax",
    secure: true, // Vercel(https)前提
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7日
  });

  return res;
}
