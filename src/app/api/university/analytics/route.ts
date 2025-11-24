// src/app/api/university/analytics/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  applications,
  jobs,
  jobUniversities,
  studentProfiles,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";

/**
 * GET /api/university/analytics?orgId=123
 *
 * Returns aggregated analytics for a single university org:
 * - summary
 * - applicationsByMonth  (based on student_profiles.university_id)
 * - jobsByStatus         (based on job_universities.university_org_id)
 * - studentsByGradYear   (based on student_profiles.university_id)
 * - studentsByProgram    (based on student_profiles.program)
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const orgIdParam = searchParams.get("orgId");

    if (!orgIdParam) {
      return NextResponse.json(
        { error: "Missing orgId query parameter" },
        { status: 400 },
      );
    }

    const orgId = Number(orgIdParam);
    if (!Number.isFinite(orgId) || orgId <= 0) {
      return NextResponse.json(
        { error: "Invalid orgId" },
        { status: 400 },
      );
    }

    // Time windows
    const now = new Date();
    const lastYear = new Date(
      now.getFullYear() - 1,
      now.getMonth(),
      now.getDate(),
    );
    const last30 = new Date(now);
    last30.setDate(last30.getDate() - 30);

    // ----- MAIN CHART DATA -----

    // Applications by month (for this university's students, last 12 months)
    const applicationsByMonthRows = await db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${applications.createdAt}), 'YYYY-MM')`,
        count: sql<number>`count(*)`,
      })
      .from(applications)
      // KEY CHANGE: join studentProfiles and filter on studentProfiles.universityId
      .innerJoin(
        studentProfiles,
        eq(applications.applicantUserId, studentProfiles.userId),
      )
      .where(
        sql`${studentProfiles.universityId} = ${orgId}
             AND ${applications.createdAt} >= ${lastYear.toISOString()}`,
      )
      .groupBy(sql`date_trunc('month', ${applications.createdAt})`)
      .orderBy(sql`date_trunc('month', ${applications.createdAt})`);

    // Jobs by status (jobs that explicitly target this university)
    const jobsByStatusRows = await db
      .select({
        status: jobs.status,
        count: sql<number>`count(*)`,
      })
      .from(jobUniversities)
      .innerJoin(jobs, eq(jobUniversities.jobId, jobs.id))
      .where(eq(jobUniversities.universityOrgId, orgId))
      .groupBy(jobs.status);

    // Students by graduation year (students linked to this university)
    const studentsByGradYearRows = await db
      .select({
        gradYear: studentProfiles.gradYear,
        count: sql<number>`count(*)`,
      })
      .from(studentProfiles)
      .where(eq(studentProfiles.universityId, orgId))
      .groupBy(studentProfiles.gradYear);

    // Students by program / major
    const studentsByProgramRows = await db
      .select({
        program: studentProfiles.program,
        count: sql<number>`count(*)`,
      })
      .from(studentProfiles)
      .where(eq(studentProfiles.universityId, orgId))
      .groupBy(studentProfiles.program);

    // ----- SUMMARY KPIs -----

    // Total students at this university
    const [studentsTotalRow] = await db
      .select({
        total: sql<number>`count(*)`,
      })
      .from(studentProfiles)
      .where(eq(studentProfiles.universityId, orgId));

    const totalStudents = Number(studentsTotalRow?.total ?? 0);

    // Students with resumes uploaded
    const [studentsWithResumeRow] = await db
      .select({
        total: sql<number>`count(*)`,
      })
      .from(studentProfiles)
      .where(
        sql`${studentProfiles.universityId} = ${orgId}
             AND ${studentProfiles.resumeUrl} IS NOT NULL
             AND ${studentProfiles.resumeUrl} <> ''`,
      );

    const studentsWithResume = Number(studentsWithResumeRow?.total ?? 0);

    // Applications in the last 30 days
    const [appsLast30Row] = await db
      .select({
        total: sql<number>`count(*)`,
      })
      .from(applications)
      .innerJoin(
        studentProfiles,
        eq(applications.applicantUserId, studentProfiles.userId),
      )
      .where(
        sql`${studentProfiles.universityId} = ${orgId}
             AND ${applications.createdAt} >= ${last30.toISOString()}`,
      );

    const applicationsLast30 = Number(appsLast30Row?.total ?? 0);

    // Unique students who applied in the last 30 days
    const [uniqueApplicantsLast30Row] = await db
      .select({
        total: sql<number>`count(distinct ${applications.applicantUserId})`,
      })
      .from(applications)
      .innerJoin(
        studentProfiles,
        eq(applications.applicantUserId, studentProfiles.userId),
      )
      .where(
        sql`${studentProfiles.universityId} = ${orgId}
             AND ${applications.createdAt} >= ${last30.toISOString()}`,
      );

    const uniqueApplicantsLast30 = Number(
      uniqueApplicantsLast30Row?.total ?? 0,
    );

    // Open jobs targeting this university
    const [openJobsRow] = await db
      .select({
        total: sql<number>`count(*)`,
      })
      .from(jobUniversities)
      .innerJoin(jobs, eq(jobUniversities.jobId, jobs.id))
      .where(
        sql`${jobUniversities.universityOrgId} = ${orgId}
             AND ${jobs.status} = 'open'`,
      );

    const openJobsTargetingUni = Number(openJobsRow?.total ?? 0);

    const payload = {
      summary: {
        totalStudents,
        studentsWithResume,
        applicationsLast30,
        uniqueApplicantsLast30,
        openJobsTargetingUni,
      },
      applicationsByMonth: applicationsByMonthRows.map((row) => ({
        month: row.month, // "2025-01", etc.
        count: Number(row.count ?? 0),
      })),
      jobsByStatus: jobsByStatusRows.map((row) => ({
        status: row.status || "unknown",
        count: Number(row.count ?? 0),
      })),
      studentsByGradYear: studentsByGradYearRows.map((row) => ({
        gradYear: row.gradYear ?? null,
        label: row.gradYear?.toString() ?? "Unknown",
        count: Number(row.count ?? 0),
      })),
      studentsByProgram: studentsByProgramRows.map((row) => ({
        program: row.program ?? null,
        label: row.program ?? "Unknown",
        count: Number(row.count ?? 0),
      })),
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("Error in /api/university/analytics:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
