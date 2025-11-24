// src/app/api/university/students/summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  users,
  studentProfiles,
  studentEducations,
  applications,
  eventRegistrations,
  eventCheckins,
} from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

function isActiveStage(stage: string | null | undefined): boolean {
  if (!stage) return true;
  const s = stage.toLowerCase();

  // Treat anything with these substrings as "inactive"
  if (
    s.includes("reject") ||
    s.includes("decline") ||
    s.includes("withdraw") ||
    s.includes("closed") ||
    s.includes("ghost")
  ) {
    return false;
  }

  return true;
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "email query param is required" },
        { status: 400 },
      );
    }

    // --- 1) Base profile (studentProfiles + users) ---

    const profileRows = await db
      .select({
        profileId: studentProfiles.id,
        userId: studentProfiles.userId,
        universityId: studentProfiles.universityId,
        name: users.name,
        email: users.email,
        program: studentProfiles.program,
        gradYear: studentProfiles.gradYear,
        verified: studentProfiles.verified,
        resumeUrl: studentProfiles.resumeUrl,
        skills: studentProfiles.skills,
        createdAt: studentProfiles.createdAt,
      })
      .from(studentProfiles)
      .leftJoin(users, eq(studentProfiles.userId, users.id))
      .where(eq(users.email, email))
      .orderBy(desc(studentProfiles.createdAt))
      .limit(1);

    const profile = profileRows[0] ?? null;

    // If they somehow exist as a user but not a student profile, we still try to return something.
    let fallbackUser: { id: number; name: string | null; email: string } | null = null;
    if (!profile) {
      const userRows = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      fallbackUser = userRows[0] ?? null;
    }

    if (!profile && !fallbackUser) {
      // No such user at all
      return NextResponse.json(
        { error: "Student not found for this email" },
        { status: 404 },
      );
    }

    const userId = profile?.userId ?? fallbackUser?.id ?? null;

    // --- 2) GPA: prefer student_educations, fallback to applications snapshot ---

    let gpa: number | string | null = null;

    if (userId != null) {
      const eduRows = await db
        .select({
          gpa: studentEducations.gpa,
          endYear: studentEducations.endYear,
          createdAt: studentEducations.createdAt,
        })
        .from(studentEducations)
        .where(eq(studentEducations.userId, userId))
        .orderBy(
          desc(studentEducations.endYear),
          desc(studentEducations.createdAt),
        )
        .limit(1);

      const edu = eduRows[0];
      if (edu?.gpa != null) {
        gpa = Number(edu.gpa);
      }
    }

    // --- 3) Applications stats (by applicant_email) ---

    const appRows = await db
      .select({
        id: applications.id,
        stage: applications.stage,
        createdAt: applications.createdAt,
        snapshotGpa: applications.gpa,
        applicantUniversityId: applications.applicantUniversityId,
      })
      .from(applications)
      .where(eq(applications.applicantEmail, email));

    const applicationsCount = appRows.length;

    let activeApplications = 0;
    let lastApplicationAt: string | null = null;

    for (const app of appRows) {
      if (isActiveStage(app.stage)) {
        activeApplications += 1;
      }

      const d = app.createdAt;
      if (d instanceof Date) {
        const iso = d.toISOString();
        if (!lastApplicationAt || d.getTime() > new Date(lastApplicationAt).getTime()) {
          lastApplicationAt = iso;
        }
      }
    }

    if (gpa == null) {
      // Fallback: take first non-null GPA snapshot from an application
      const withGpa = appRows.find((a) => a.snapshotGpa != null);
      if (withGpa?.snapshotGpa) {
        gpa = withGpa.snapshotGpa;
      }
    }

    // --- 4) Event stats (registrations + check-ins) ---

    const regAgg = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${eventRegistrations.eventId})`,
      })
      .from(eventRegistrations)
      .where(eq(eventRegistrations.userEmail, email));

    const eventsRegistered = Number(regAgg[0]?.count ?? 0);

    const checkinAgg = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${eventCheckins.eventId})`,
      })
      .from(eventCheckins)
      .where(eq(eventCheckins.userEmail, email));

    const eventsAttended = Number(checkinAgg[0]?.count ?? 0);

    // --- 5) Build normalized response ---

    // --- 5) Build normalized response ---

const summary = {
  // ensure this is always the studentProfiles.id so we can route to /students/[id]
  id: profile?.profileId ?? 0,
  name: profile?.name ?? fallbackUser?.name ?? null,
  email: profile?.email ?? fallbackUser?.email ?? email,
  program: profile?.program ?? null,
  gradYear: profile?.gradYear ?? null,
  gpa: gpa ?? null,
  resumeUrl: profile?.resumeUrl ?? null,
  skills: profile?.skills ?? [],
  applicationsCount,
  activeApplications,
  lastApplicationAt,
  eventsRegistered,
  eventsAttended,
};

return NextResponse.json(summary);

  } catch (error) {
    console.error("GET /api/university/students/summary error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
