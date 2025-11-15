import { NextResponse } from "next/server";

export function middleware(req) {
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  // Allow vendor uploads without login
  if (pathname.startsWith("/vendor-upload")) {
    return NextResponse.next();
  }

  // Protected pages (require login)
  const protectedRoutes = [
    "/dashboard",
    "/vendors",
    "/upload-coi"
  ];

  const sessionToken = req.cookies.get("sb-access-token")?.value;

  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!sessionToken) {
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/vendors/:path*",
    "/upload-coi/:path*",
    "/vendor-upload/:path*"
  ]
};
