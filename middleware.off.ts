// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ まず「SEO/静的/検証」は素通り
  if (
    pathname === "/sitemap.xml" ||
    pathname === "/robots.txt" ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/opengraph-image") ||
    pathname.startsWith("/twitter-image") ||
    (pathname.startsWith("/google") && pathname.endsWith(".html"))
  ) {
    return NextResponse.next();
  }

  // ✅ ここ超重要：ジャンル配下は絶対 rewrite させない（slug潰れ防止）
  if (pathname === "/genre" || pathname.startsWith("/genre/")) {
    return NextResponse.next();
  }

  // ✅ ついでに動画ページも（必要なら）
  if (pathname === "/adult-short-videos" || pathname.startsWith("/video/")) {
    return NextResponse.next();
  }

  // ----
  // ここから下に「本来やりたい処理（認証/年齢ゲート等）」を書く
  // ただし、NextResponse.rewrite("/genre") みたいなのは絶対しない
  // ----

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
