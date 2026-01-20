import { NextResponse } from "next/server";

export function middleware(req: any) {
  const pathname = req.nextUrl?.pathname ?? "";

  // /admin 以外は一切触らない
  if (!pathname.startsWith("/admin")) return NextResponse.next();

  // ログインページは通す
  if (pathname === "/admin/login") return NextResponse.next();

  // Cookie が無ければログインへ
  const ok = req.cookies?.get("/admin")?.value === "1";
  if (!ok) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
