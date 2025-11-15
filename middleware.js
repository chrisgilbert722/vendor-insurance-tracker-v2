import { NextResponse } from "next/server";

export function middleware(req) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  const protectedRoutes = ["/dashboard", "/vendors", "/upload-coi"];

  const token = req.cookies.get("sb-access-token")?.value;

  if (protectedRoutes.some((r) => pathname.startsWith(r))) {
    if (!token) {
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}
