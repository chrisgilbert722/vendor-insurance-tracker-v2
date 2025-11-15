import { NextResponse } from "next/server";

export function middleware(req) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  const protectedRoutes = ["/dashboard", "/vendors", "/upload-coi"];

  const token =
    req.cookies.get("sb-access-token")?.value ||
    req.cookies.get("sb-refresh-token")?.value;

  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!token) {
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}
