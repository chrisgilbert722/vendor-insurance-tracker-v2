import { NextResponse } from "next/server";

export function middleware(req) {
  const url = req.nextUrl;
  const pathname = url.pathname;

  // Protected routes
  const protectedRoutes = ["/dashboard", "/vendors", "/upload-coi"];

  const session = req.cookies.get("sb-access-token")?.value;

  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!session) {
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}
