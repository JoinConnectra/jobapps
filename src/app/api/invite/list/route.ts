import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { organizationInvites, memberships, users } from "@/db/schema-pg";
import { and, eq, gt, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const orgIdParam = request.nextUrl.searchParams.get("orgId");
    const orgId = Number(orgIdParam);

    if (!orgId || Number.isNaN(orgId)) {
      return NextResponse.json({ error: "Valid orgId query parameter is required" }, { status: 400 });
    }

    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const inviter = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (inviter.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const membership = await db
      .select({ id: memberships.id, role: memberships.role })
      .from(memberships)
      .where(
        and(eq(memberships.orgId, orgId), eq(memberships.userId, inviter[0].id))
      )
      .limit(1);

    if (membership.length === 0) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const now = new Date();
    const invites = await db
      .select({
        id: organizationInvites.id,
        email: organizationInvites.email,
        role: organizationInvites.role,
        token: organizationInvites.token,
        expiresAt: organizationInvites.expiresAt,
        accepted: organizationInvites.accepted,
        invitedBy: organizationInvites.invitedBy,
        acceptedAt: organizationInvites.acceptedAt,
        createdAt: organizationInvites.createdAt,
        updatedAt: organizationInvites.updatedAt,
      })
      .from(organizationInvites)
      .where(
        and(
          eq(organizationInvites.orgId, orgId),
          eq(organizationInvites.accepted, false),
          gt(organizationInvites.expiresAt, now)
        )
      )
      .orderBy(desc(organizationInvites.createdAt));

    return NextResponse.json(invites);
  } catch (error) {
    console.error("GET /api/invite/list error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

