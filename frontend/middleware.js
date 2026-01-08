import { NextResponse } from "next/server";

const ALLOWED_ORIGINS = new Set([
  "https://degenbox.fun",
  "https://www.degenbox.fun",
]);

export function middleware(req) {
  const origin = req.headers.get("origin");
  const res = NextResponse.next();

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Vary", "Origin");
    res.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    // Enable only if you actually need cookies cross-origin
    // res.headers.set("Access-Control-Allow-Credentials", "true");
  }

  if (req.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: res.headers });
  }

  return res;
}

export const config = {
  matcher: ["/api/:path*"],
};
