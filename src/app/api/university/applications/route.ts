// src/app/api/university/applications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  applications,
  studentProfiles,
  users,
  jobs,
  organizations,
} from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";

/**
 * GET /api/university/applications?orgId=123
 * Returns job applications submitted by students whose student_profiles.university_id = orgId.
 */
export async function GET(request: NextRequest) {
  try {
    const orgIdParam = request.nextUrl.searchParams.get("orgId");
    const orgId = orgIdParam ? Number(orgIdParam) : null;

    if (!orgId || Number.isNaN(orgId)) {
      // For MVP: if we don't know the university, just return empty.
      return NextResponse.json([]);
    }

    const rows = await db
      .select({
        id: applications.id,
        jobId: applications.jobId,
        stage: applications.stage,
        createdAt: applications.createdAt,

        // student info
        studentName: users.name,
        studentEmail: applications.applicantEmail,
        program: studentProfiles.program,
        gradYear: studentProfiles.gradYear,

        // job + company info
        jobTitle: jobs.title,
        companyName: organizations.name,
      })
      .from(applications)
      .leftJoin(
        studentProfiles,
        eq(applications.applicantUserId, studentProfiles.userId),
      )
      .leftJoin(users, eq(studentProfiles.userId, users.id))
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .leftJoin(organizations, eq(jobs.orgId, organizations.id))
      .where(eq(studentProfiles.universityId, orgId))
      .orderBy(desc(applications.createdAt));

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /api/university/applications error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
