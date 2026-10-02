import { NextRequest, NextResponse } from "next/server";

import { SITE_ACCESS_COOKIE } from "@/lib/config";

const PUBLIC_PREFIXES = ["/_next", "/entrar", "/api"];

export function proxy(request: NextRequest) {
  if (request.cookies.has(SITE_ACCESS_COOKIE)) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isPublic) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/entrar";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};