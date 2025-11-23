import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, desc, eq, like } from "drizzle-orm";
import { db } from "@/db";
import { jobs, jobUniversities, organizations } from "@/db/schema-pg";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const orgIdParam = searchParams.get("orgId");
    const q = (searchParams.get("q") || "").trim();

    if (!orgIdParam) {
      return NextResponse.json(
        { error: "Missing orgId query parameter." },
        { status: 400 }
      );
    }

    const orgId = Number.parseInt(orgIdParam, 10);
    if (!Number.isFinite(orgId)) {
      return NextResponse.json(
        { error: "Invalid orgId query parameter." },
        { status: 400 }
      );
    }

    const conditions = [eq(jobUniversities.universityOrgId, orgId), eq(jobs.status, "published" as const)];

    if (q) {
      // simple title search; you can expand this later if needed
      conditions.push(like(jobs.title, `%${q}%`));
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
      { status: 500 }
    );
  }
}
