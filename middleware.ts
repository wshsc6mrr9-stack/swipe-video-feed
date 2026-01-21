import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "admin_auth";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /admin/login と login API は素通し
  if (pathname === "/admin/login" || pathname === "/api/admin/login") {
    return NextResponse.next();
  }

  // /admin 配下だけ保護
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const authed = req.cookies.get(COOKIE_NAME)?.value === "1";
    if (!authed) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/login"],
};
