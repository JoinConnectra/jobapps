// src/app/api/university/partners/summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  organizations,
  employerProfiles,
  universityAuthorizations,
  universityPartnerMeta,
  jobs,
  events,
  applications,
} from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const companyName = request.nextUrl.searchParams.get("companyName");
    const universityOrgIdParam =
      request.nextUrl.searchParams.get("universityOrgId");

    if (!companyName) {
      return NextResponse.json(
        { error: "companyName query param is required" },
        { status: 400 },
      );
    }

    const universityOrgId = universityOrgIdParam
      ? Number(universityOrgIdParam)
      : null;
    const hasUniversity = universityOrgId != null && !Number.isNaN(universityOrgId);

    // --- 1) Find the company organization by name ---

    const orgRows = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        aboutCompany: organizations.aboutCompany,
        websiteUrl: organizations.link,
      })
      .from(organizations)
      .where(eq(organizations.name, companyName))
      .limit(1);

    const org = orgRows[0];

    if (!org) {
      return NextResponse.json(
        { error: "Company organization not found" },
        { status: 404 },
      );
    }

    const companyOrgId = org.id;

    // --- 2) Employer profile (industry, etc.) ---

    const employerRows = await db
      .select({
        industry: employerProfiles.industry,
        locations: employerProfiles.locations,
      })
      .from(employerProfiles)
      .where(eq(employerProfiles.orgId, companyOrgId))
      .limit(1);

    const employer = employerRows[0] ?? null;

    // --- 3) University-specific authorization + meta (if universityOrgId provided) ---

    let authRow:
      | (typeof universityAuthorizations.$inferSelect & {
          priority: string | null;
          lastMeetingDate: Date | null;
          internalNotes: string | null;
        })
      | null = null;

    if (hasUniversity) {
      const authRows = await db
        .select({
          id: universityAuthorizations.id,
          companyOrgId: universityAuthorizations.companyOrgId,
          universityOrgId: universityAuthorizations.universityOrgId,
          status: universityAuthorizations.status,
          createdAt: universityAuthorizations.createdAt,
          priority: universityPartnerMeta.priority,
          lastMeetingDate: universityPartnerMeta.lastMeetingDate,
          internalNotes: universityPartnerMeta.internalNotes,
        })
        .from(universityAuthorizations)
        .leftJoin(
          universityPartnerMeta,
          eq(
            universityPartnerMeta.authorizationId,
            universityAuthorizations.id,
          ),
        )
        .where(
          and(
            eq(universityAuthorizations.companyOrgId, companyOrgId),
            eq(universityAuthorizations.universityOrgId, universityOrgId!),
          ),
        )
        .orderBy(desc(universityAuthorizations.createdAt))
        .limit(1);

      authRow = (authRows[0] as any) ?? null;
    }

    // --- 4) Jobs count + last job timestamp ---

    const jobsAgg = await db
      .select({
        count: sql<number>`COUNT(*)`,
        lastJobAt: sql<Date | null>`MAX(${jobs.updatedAt})`,
      })
      .from(jobs)
      .where(eq(jobs.orgId, companyOrgId));

    const jobsCount = Number(jobsAgg[0]?.count ?? 0);
    const lastJobAt =
      jobsAgg[0]?.lastJobAt instanceof Date ? jobsAgg[0].lastJobAt : null;

    // --- 5) Events count (employer-hosted) + last event timestamp ---

    const eventsAgg = await db
      .select({
        count: sql<number>`COUNT(*)`,
        lastEventAt: sql<Date | null>`MAX(${events.updatedAt})`,
      })
      .from(events)
      .where(
        and(eq(events.orgId, companyOrgId), eq(events.isEmployerHosted, true)),
      );

    const eventsCount = Number(eventsAgg[0]?.count ?? 0);
    const lastEventAt =
      eventsAgg[0]?.lastEventAt instanceof Date
        ? eventsAgg[0].lastEventAt
        : null;

    // --- 6) Applications count to this company's jobs
    //     If universityOrgId is provided, only count that uni's students ---

    let appsWhere;
    if (hasUniversity) {
      appsWhere = and(
        eq(jobs.orgId, companyOrgId),
        eq(applications.applicantUniversityId, universityOrgId!),
      );
    } else {
      appsWhere = eq(jobs.orgId, companyOrgId);
    }

    const appsAgg = await db
      .select({
        count: sql<number>`COUNT(*)`,
        lastAppAt: sql<Date | null>`MAX(${applications.createdAt})`,
      })
      .from(applications)
      .innerJoin(jobs, eq(jobs.id, applications.jobId))
      .where(appsWhere);

    const applicationsCount = Number(appsAgg[0]?.count ?? 0);
    const lastAppAt =
      appsAgg[0]?.lastAppAt instanceof Date ? appsAgg[0].lastAppAt : null;

    // --- 7) Compute lastInteractionAt (latest of job/event/app/meta dates) ---

    const candidateDates: Date[] = [];

    if (lastJobAt) candidateDates.push(lastJobAt);
    if (lastEventAt) candidateDates.push(lastEventAt);
    if (lastAppAt) candidateDates.push(lastAppAt);
    if (authRow?.createdAt instanceof Date) candidateDates.push(authRow.createdAt);
    if (authRow?.lastMeetingDate instanceof Date)
      candidateDates.push(authRow.lastMeetingDate);

    let lastInteractionAt: string | null = null;
    if (candidateDates.length > 0) {
      const latest = candidateDates.reduce((acc, d) =>
        !acc || d.getTime() > acc.getTime() ? d : acc,
      );
      lastInteractionAt = latest.toISOString();
    }

    // --- 8) Build summary payload ---

    const summary = {
      id: authRow?.id ?? companyOrgId, // some stable ID for the UI
      companyOrgId,
      companyName: org.name,
      status: authRow?.status ?? "unknown",
      industry: employer?.industry ?? null,
      websiteUrl: org.websiteUrl ?? null,
      aboutCompany: org.aboutCompany ?? null,
      jobsCount,
      eventsCount,
      applicationsCount,
      priority: authRow?.priority ?? null,
      lastInteractionAt,
      lastMeetingDate: authRow?.lastMeetingDate ?? null,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("GET /api/university/partners/summary error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
