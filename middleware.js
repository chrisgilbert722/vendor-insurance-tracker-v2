import { NextResponse } from "next/server";

export function middleware(req) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  // Protected routes
  const protectedRoutes = ["/dashboard", "/vendors", "/upload-coi"];

  // Supabase no longer uses cookies for PKCE sessions.
  // So we ALWAYS allow the request through — UI pages check localStorage instead.

  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    // Let Next.js continue to the page.
    return NextResponse.next();
  }

  return NextResponse.next();
}
