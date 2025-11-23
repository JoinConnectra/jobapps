import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { studentProfiles, users } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

/**
 * GET /api/university/students?orgId=123
 * Returns basic student info for that university.
 */
export async function GET(request: NextRequest) {
  try {
    const orgIdParam = request.nextUrl.searchParams.get("orgId");
    const orgId = orgIdParam ? Number(orgIdParam) : null;

    if (!orgId || Number.isNaN(orgId)) {
      // For MVP, if we don't know the university, just return empty.
      return NextResponse.json([]);
    }

    const rows = await db
      .select({
        id: studentProfiles.id,
        userId: studentProfiles.userId,
        name: users.name,
        email: users.email,
        program: studentProfiles.program,
        gradYear: studentProfiles.gradYear,
        verified: studentProfiles.verified,
        resumeUrl: studentProfiles.resumeUrl,
        createdAt: studentProfiles.createdAt,
      })
      .from(studentProfiles)
      .leftJoin(users, eq(studentProfiles.userId, users.id))
      .where(eq(studentProfiles.universityId, orgId))
      .orderBy(desc(studentProfiles.createdAt));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /api/university/students error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
