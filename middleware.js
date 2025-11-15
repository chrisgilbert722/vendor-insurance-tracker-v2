import { NextResponse } from "next/server";

export function middleware(req) {
  const session = req.cookies.get("sb-access-token");

  const publicPaths = [
    "/auth/login",
    "/auth/callback",
    "/auth/reset",  
    "/favicon.ico",
    "/_next",
    "/"
  ];

  if (publicPaths.some(path => req.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (!session) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  return NextResponse.next();
}
