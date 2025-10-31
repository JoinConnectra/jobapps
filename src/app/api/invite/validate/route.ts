import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizationInvites, organizations } from "@/db/schema-pg";
import { and, eq, gt } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "Invite token is required" }, { status: 400 });
    }

    const now = new Date();
    const invite = await db
      .select({
        id: organizationInvites.id,
        token: organizationInvites.token,
        email: organizationInvites.email,
        role: organizationInvites.role,
        expiresAt: organizationInvites.expiresAt,
        orgId: organizationInvites.orgId,
        orgName: organizations.name,
        orgSlug: organizations.slug,
        orgType: organizations.type,
      })
      .from(organizationInvites)
      .innerJoin(organizations, eq(organizationInvites.orgId, organizations.id))
      .where(
        and(
          eq(organizationInvites.token, token),
          eq(organizationInvites.accepted, false),
          gt(organizationInvites.expiresAt, now)
        )
      )
      .limit(1);

    if (invite.length === 0) {
      return NextResponse.json({ error: "Invite not found or expired" }, { status: 404 });
    }

    return NextResponse.json(invite[0]);
  } catch (error) {
    console.error("GET /api/invite/validate error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

