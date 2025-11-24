import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { studentProfiles, users, applications } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";

/**
 * GET /api/university/students?orgId=123
 * Returns basic student info + engagement stats for that university.
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
        skills: studentProfiles.skills,

        // Engagement (all applications by this user)
        applicationsCount: sql<number>`count(${applications.id})`,
        lastApplicationAt: sql<Date | null>`max(${applications.createdAt})`,
      })
      .from(studentProfiles)
      .leftJoin(users, eq(studentProfiles.userId, users.id))
      .leftJoin(
        applications,
        eq(applications.applicantUserId, studentProfiles.userId)
      )
      .where(eq(studentProfiles.universityId, orgId))
      .groupBy(
        studentProfiles.id,
        studentProfiles.userId,
        studentProfiles.program,
        studentProfiles.gradYear,
        studentProfiles.verified,
        studentProfiles.resumeUrl,
        studentProfiles.createdAt,
        studentProfiles.skills,
        users.name,
        users.email
      )
      .orderBy(desc(studentProfiles.createdAt));

    const normalized = rows.map((row) => {
      let last: string | null = null;
      const rawLast = row.lastApplicationAt as unknown;

      if (rawLast instanceof Date) {
        last = rawLast.toISOString();
      } else if (typeof rawLast === "string") {
        last = rawLast;
      }

      return {
        ...row,
        applicationsCount: Number(
          (row.applicationsCount as unknown as number | string) ?? 0
        ),
        lastApplicationAt: last,
      };
    });

    return NextResponse.json(normalized);
  } catch (error) {
    console.error("GET /api/university/students error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
