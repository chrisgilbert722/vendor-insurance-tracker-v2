import { NextResponse } from "next/server";

export function middleware(req) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  // Protected routes
  const protectedRoutes = ["/dashboard", "/vendors", "/upload-coi"];

  // Supabase sets this cookie after OTP login
  const sessionToken = req.cookies.get("sb-access-token")?.value;

  // Protect all authenticated routes
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!sessionToken) {
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}
