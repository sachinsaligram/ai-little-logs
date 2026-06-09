import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;

  // Allow auth API routes through
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Protect /api routes
  if (pathname.startsWith("/api") && !isAuthenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Protect (auth) group routes — matched by the config below
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!login|_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.svg$).*)",
  ],
};
