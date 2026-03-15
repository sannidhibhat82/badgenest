import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.FRONTEND_ORIGIN || "http://localhost:8080",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
};

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api")) {
    if (req.method === "OPTIONS") {
      return new NextResponse(null, { status: 200, headers: corsHeaders });
    }
    const res = NextResponse.next();
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.headers.set(key, value);
    });
    return res;
  }
  return NextResponse.next();
}
