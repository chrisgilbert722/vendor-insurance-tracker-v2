import { NextResponse } from "next/server";

export function middleware(req) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  // 🚨 Allow Supabase callback to pass WITHOUT requiring cookie
  if (pathname.startsWith("/auth/callback")) {
    return NextResponse.next();
  }

  // Protected routes
  const protectedRoutes = ["/dashboard", "/vendors", "/upload-coi"];

  const sessionToken = req.cookies.get("sb-access-token")?.value;

  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!sessionToken) {
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}
