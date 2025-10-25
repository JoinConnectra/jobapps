// /src/app/api/analytics/applications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { applications, jobs } from "@/db/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orgId = Number(searchParams.get("orgId"));
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!orgId || isNaN(orgId)) {
      return NextResponse.json({ error: "orgId is required" }, { status: 400 });
    }

    // Build conditions
    const conditions: any[] = [eq(jobs.orgId, orgId)];
    if (from) conditions.push(gte(applications.createdAt, new Date(from)));
    if (to) conditions.push(lte(applications.createdAt, new Date(to)));

    // -------------------------------
    // Applicants by City
    // -------------------------------
    const byCity = await db
      .select({
        city: applications.city,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(and(...conditions))
      .groupBy(applications.city)
      .orderBy(sql`count(*) desc`);

    // -------------------------------
    // Applicants by University
    // -------------------------------
    const byUniversity = await db
      .select({
        university: applications.university,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(and(...conditions))
      .groupBy(applications.university)
      .orderBy(sql`count(*) desc`);

    // -------------------------------
    // Total Applicants
    // -------------------------------
    const totalResult = await db
      .select({
        count: sql<number>`count(*)`.as("count"),
      })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .where(and(...conditions));

    const total = totalResult[0]?.count || 0;

    return NextResponse.json(
      {
        byCity: byCity.filter((r) => r.city), // remove nulls
        byUniversity: byUniversity.filter((r) => r.university),
        total,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("GET /api/analytics/applications error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
