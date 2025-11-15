import { NextResponse } from "next/server";

export function middleware(req) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  // Protected routes
  const protectedRoutes = ["/dashboard", "/vendors", "/upload-coi"];

  // Supabase always sets *both* of these cookies on OTP login
  const accessToken = req.cookies.get("sb-access-token");
  const refreshToken = req.cookies.get("sb-refresh-token");

  const isLoggedIn = accessToken?.value && refreshToken?.value;

  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    if (!isLoggedIn) {
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/vendors/:path*", "/upload-coi/:path*"]
};
