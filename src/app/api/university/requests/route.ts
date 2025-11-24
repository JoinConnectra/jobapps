import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  universityAuthorizations,
  organizations,
  employerProfiles,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
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
    const orgId = orgIdParam ? parseInt(orgIdParam) : NaN;
    if (!orgId || Number.isNaN(orgId))
      return NextResponse.json(
        { error: "orgId required" },
        { status: 400 },
      );

    const rows = await db
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
      .where(eq(universityAuthorizations.universityOrgId, orgId));

    return NextResponse.json(rows);
  } catch (e) {
    console.error("GET /api/university/requests error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
