import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  universityAuthorizations,
  organizations,
  employerProfiles,
  jobs,
  events,
  applications,
  universityPartnerMeta,
} from "@/db/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email)
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );

    const orgIdParam = request.nextUrl.searchParams.get("orgId");
    const orgId = orgIdParam ? parseInt(orgIdParam, 10) : NaN;
    if (!orgId || Number.isNaN(orgId))
      return NextResponse.json(
        { error: "orgId required" },
        { status: 400 },
      );

    // Base rows: one per employer–university authorization
    const baseRows = await db
      .select({
        id: universityAuthorizations.id,
        companyOrgId: universityAuthorizations.companyOrgId,
        companyName: organizations.name,
        status: universityAuthorizations.status,
        createdAt: universityAuthorizations.createdAt,

        // extra fields for rich UI
        logoUrl: organizations.logoUrl,
        aboutCompany: organizations.aboutCompany,
        websiteUrl: organizations.link,
        industry: employerProfiles.industry,
        locations: employerProfiles.locations,

        // Meta fields from university_partner_meta (may be null if not set)
        priority: universityPartnerMeta.priority,
        primaryContactName: universityPartnerMeta.primaryContactName,
        primaryContactEmail: universityPartnerMeta.primaryContactEmail,
        primaryContactRole: universityPartnerMeta.primaryContactRole,
        primaryContactPhone: universityPartnerMeta.primaryContactPhone,
        lastMeetingDate: universityPartnerMeta.lastMeetingDate,
        internalNotes: universityPartnerMeta.internalNotes,
      })
      .from(universityAuthorizations)
      .leftJoin(
        organizations,
        eq(organizations.id, universityAuthorizations.companyOrgId),
      )
      .leftJoin(
        employerProfiles,
        eq(employerProfiles.orgId, universityAuthorizations.companyOrgId),
      )
      .leftJoin(
        universityPartnerMeta,
        eq(universityPartnerMeta.authorizationId, universityAuthorizations.id),
      )
      .where(eq(universityAuthorizations.universityOrgId, orgId));

    if (baseRows.length === 0) {
      return NextResponse.json(baseRows);
    }

    // Collect company org IDs for aggregates
    const companyOrgIds = Array.from(
      new Set(
        baseRows
          .map((r) => r.companyOrgId)
          .filter((id): id is number => typeof id === "number"),
      ),
    );

    if (companyOrgIds.length === 0) {
      return NextResponse.json(
        baseRows.map((r) => ({
          ...r,
          jobsCount: 0,
          eventsCount: 0,
          applicationsCount: 0,
        })),
      );
    }

    // ---- Jobs per company (simple: all jobs owned by that org) ----
    const jobsCounts = await db
      .select({
        orgId: jobs.orgId,
        count: sql<number>`COUNT(*)`,
      })
      .from(jobs)
      .where(inArray(jobs.orgId, companyOrgIds))
      .groupBy(jobs.orgId);

    const jobsCountMap = new Map<number, number>();
    for (const row of jobsCounts) {
      if (row.orgId != null) {
        jobsCountMap.set(row.orgId, Number(row.count ?? 0));
      }
    }

    // ---- Events per company (employer-hosted events by that org) ----
    const eventsCounts = await db
      .select({
        orgId: events.orgId,
        count: sql<number>`COUNT(*)`,
      })
      .from(events)
      .where(
        and(
          inArray(events.orgId, companyOrgIds),
          eq(events.isEmployerHosted, true),
        ),
      )
      .groupBy(events.orgId);

    const eventsCountMap = new Map<number, number>();
    for (const row of eventsCounts) {
      if (row.orgId != null) {
        eventsCountMap.set(row.orgId, Number(row.count ?? 0));
      }
    }

    // ---- Applications from *your* students to that company's jobs ----
    const appsCounts = await db
      .select({
        orgId: jobs.orgId,
        count: sql<number>`COUNT(*)`,
      })
      .from(applications)
      .innerJoin(jobs, eq(jobs.id, applications.jobId))
      .where(
        and(
          inArray(jobs.orgId, companyOrgIds),
          eq(applications.applicantUniversityId, orgId),
        ),
      )
      .groupBy(jobs.orgId);

    const appsCountMap = new Map<number, number>();
    for (const row of appsCounts) {
      if (row.orgId != null) {
        appsCountMap.set(row.orgId, Number(row.count ?? 0));
      }
    }

    // Merge aggregates back onto the base rows
    const enriched = baseRows.map((row) => ({
      ...row,
      jobsCount: jobsCountMap.get(row.companyOrgId) ?? 0,
      eventsCount: eventsCountMap.get(row.companyOrgId) ?? 0,
      applicationsCount: appsCountMap.get(row.companyOrgId) ?? 0,
    }));

    return NextResponse.json(enriched);
  } catch (e) {
    console.error("GET /api/university/requests error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
