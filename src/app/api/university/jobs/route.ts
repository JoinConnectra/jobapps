// src/app/api/university/jobs/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { SQL } from "drizzle-orm";
import { and, desc, eq, like, or } from "drizzle-orm";
import { db } from "@/db";
import { jobs, jobUniversities, organizations } from "@/db/schema-pg";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const orgIdParam = searchParams.get("orgId");
    const jobIdParam = searchParams.get("jobId");
    const q = (searchParams.get("q") || "").trim();

    if (!orgIdParam) {
      return NextResponse.json(
        { error: "Missing orgId query parameter." },
        { status: 400 },
      );
    }

    const orgId = Number.parseInt(orgIdParam, 10);
    if (!Number.isFinite(orgId)) {
      return NextResponse.json(
        { error: "Invalid orgId query parameter." },
        { status: 400 },
      );
    }

    const conditions: SQL[] = [
      eq(jobUniversities.universityOrgId, orgId),
      eq(jobs.status, "published" as const),
    ];

    if (jobIdParam) {
      const jobId = Number.parseInt(jobIdParam, 10);
      if (!Number.isFinite(jobId)) {
        return NextResponse.json(
          { error: "Invalid jobId query parameter." },
          { status: 400 },
        );
      }
      conditions.push(eq(jobs.id, jobId));
    }

    if (q) {
      const likeQuery = `%${q}%`;

      const searchCondition = or(
        like(jobs.title, likeQuery),
        like(jobs.dept, likeQuery),
        like(organizations.name, likeQuery),
        like(jobs.location, likeQuery),
        like(jobs.locationMode, likeQuery),
      ) as SQL;

      conditions.push(searchCondition);
    }

    const rows = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        dept: jobs.dept,
        status: jobs.status,
        visibility: jobs.visibility,
        locationMode: jobs.locationMode,
        location: jobs.location,
        seniority: jobs.seniority,
        orgId: jobs.orgId,
        orgName: organizations.name,
        orgSlug: organizations.slug,
        createdAt: jobs.createdAt,

        // NEW: richer details for university view
        salaryRange: jobs.salaryRange,
        descriptionMd: jobs.descriptionMd,
        skillsCsv: jobs.skillsCsv,
      })
      .from(jobUniversities)
      .innerJoin(jobs, eq(jobUniversities.jobId, jobs.id))
      .leftJoin(organizations, eq(organizations.id, jobs.orgId))
      .where(and(...conditions))
      .orderBy(desc(jobs.createdAt));

    return NextResponse.json(rows, { status: 200 });
  } catch (error: any) {
    console.error("Error in /api/university/jobs:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
