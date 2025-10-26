import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // Let the client-side hooks handle the security checks
  // This is more reliable than trying to do it in middleware
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/organizations", "/jobs", "/applications", "/settings", "/u"],
};