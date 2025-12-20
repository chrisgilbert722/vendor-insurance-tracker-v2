// middleware.js
// ============================================================
// Onboarding Route Guard (Production Safe)
// - Prevents access to /onboarding/* once complete
// - Backend-driven via /api/onboarding/status
// - Safe on refresh, deep links, bookmarks
// ============================================================

import { NextResponse } from "next/server";

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // Only guard onboarding routes
  if (!pathname.startsWith("/onboarding")) {
    return NextResponse.next();
  }

  try {
    // Derive origin safely
    const url = req.nextUrl.clone();
    url.pathname = "/api/onboarding/status";

    const res = await fetch(url.toString(), {
      headers: {
        cookie: req.headers.get("cookie") || "",
      },
    });

    const json = await res.json();

    // If onboarding is complete → redirect to dashboard
    if (json?.ok && json.onboardingComplete === true) {
      const redirectUrl = req.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      return NextResponse.redirect(redirectUrl);
    }
  } catch (err) {
    // Fail open — never block user on middleware failure
    console.error("[middleware] onboarding guard error:", err);
  }

  return NextResponse.next();
}

// 🔒 Apply middleware ONLY to onboarding routes
export const config = {
  matcher: ["/onboarding/:path*"],
};
