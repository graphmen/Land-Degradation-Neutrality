import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Allow national mobile app (Capacitor) to call APIs from file/https origins. */
export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const allowOrigin = process.env.CORS_ALLOW_ORIGIN || "*";
  const headers = new Headers();
  headers.set("Access-Control-Allow-Origin", allowOrigin);
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers });
  }

  const response = NextResponse.next();
  headers.forEach((value, key) => response.headers.set(key, value));
  return response;
}

export const config = {
  matcher: "/api/:path*",
};