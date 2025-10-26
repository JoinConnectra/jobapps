import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Returns the Better-Auth session the same way your client hook expects.
 * 200 with { user, session } if logged in; 401 otherwise.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    return NextResponse.json(session, { status: 200 });
  } catch (err) {
    console.error("GET /api/auth/session error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
