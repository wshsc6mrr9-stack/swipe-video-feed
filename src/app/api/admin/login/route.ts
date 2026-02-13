import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    const { password } = await req.json();

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { ok: false, error: "invalid password" },
        { status: 401 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set("admin", "1", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "login failed" },
      { status: 500 }
    );
  }
}
