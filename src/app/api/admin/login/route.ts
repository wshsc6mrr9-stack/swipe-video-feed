import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const password = String((body as any).password ?? "").trim();

  if (!password) {
    return NextResponse.json({ ok: false, error: "password is required" }, { status: 400 });
  }

  // 仮：パスワード一致でOK（必要なら後でちゃんと認証にする）
  const ok = password === (process.env.ADMIN_PASSWORD ?? "admin");

  if (!ok) {
    return NextResponse.json({ ok: false, error: "invalid password" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
