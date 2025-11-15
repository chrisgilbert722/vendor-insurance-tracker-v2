import { NextResponse } from "next/server";

export function middleware(req) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  const protectedRoutes = ["/dashboard", "/vendors", "/upload-coi"];

  const session = req.cookies.get("sb-access-token");

  if (protectedRoutes.includes(pathname)) {
    if (!session) {
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}
