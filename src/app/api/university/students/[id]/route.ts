// src/app/api/university/students/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  studentProfiles,
  users,
  applications,
  jobs,
  organizations,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idNum = Number(params.id);
    if (!idNum || Number.isNaN(idNum)) {
      return NextResponse.json(
        { error: "Invalid student id" },
        { status: 400 }
      );
    }

    // 1) Load the student profile + user info
    const [studentRow] = await db
      .select({
        id: studentProfiles.id,
        userId: studentProfiles.userId,
        universityId: studentProfiles.universityId,
        program: studentProfiles.program,
        gradYear: studentProfiles.gradYear,
        resumeUrl: studentProfiles.resumeUrl,
        verified: studentProfiles.verified,
        createdAt: studentProfiles.createdAt,

        name: users.name,
        email: users.email,
      })
      .from(studentProfiles)
      .leftJoin(users, eq(studentProfiles.userId, users.id))
      .where(eq(studentProfiles.id, idNum));

    if (!studentRow) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // 2) Load this student's applications (by userId)
    const apps = await db
      .select({
        id: applications.id,
        jobId: applications.jobId,
        stage: applications.stage,
        createdAt: applications.createdAt,

        jobTitle: jobs.title,
        companyName: organizations.name,
      })
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .leftJoin(organizations, eq(jobs.orgId, organizations.id))
      .where(eq(applications.applicantUserId, studentRow.userId));

    return NextResponse.json({
      student: studentRow,
      applications: apps,
    });
  } catch (error) {
    console.error("GET /api/university/students/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
