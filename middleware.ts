import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ クローラー/検証系は素通り
  if (
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt" ||
    (pathname.startsWith("/google") && pathname.endsWith(".html")) ||
    pathname.startsWith("/opengraph-image") ||
    pathname.startsWith("/twitter-image")
  ) {
    return NextResponse.next();
  }

  // ↓ここから下に「今ある middleware の中身（認証など）」をそのまま置く
  return NextResponse.next();
}

// matcher が広すぎるなら、ここにも除外を入れる（すでにあるなら調整）
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
