import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { organizationInvites, memberships, organizations, users } from "@/db/schema-pg";
import { and, eq } from "drizzle-orm";

const DEFAULT_EXPIRY_DAYS = 7;

export async function POST(request: NextRequest) {
  try {
    console.log("=== Invite Create API Debug ===");
    const body = await request.json();
    console.log("Request body:", body);
    
    const orgId = Number(body?.orgId);
    const role: string = (body?.role ?? "member").toString();
    const rawEmail: string | undefined = body?.email;
    const email = rawEmail ? rawEmail.trim().toLowerCase() : null;

    console.log("Parsed values:", { orgId, role, email });

    if (!orgId || Number.isNaN(orgId)) {
      console.log("Invalid orgId:", orgId);
      return NextResponse.json({ error: "Valid orgId is required" }, { status: 400 });
    }

    console.log("Getting session...");
    const session = await auth.api.getSession({ headers: request.headers });
    console.log("Session result:", session);
    
    if (!session?.user?.email) {
      console.log("No session or user email found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Looking up inviter user with email:", session.user.email);
    const inviter = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    console.log("Inviter query result:", inviter);
    if (inviter.length === 0) {
      console.log("Inviter user not found");
      return NextResponse.json({ error: "Inviting user not found" }, { status: 404 });
    }

    console.log("Looking up organization with id:", orgId);
    const org = await db
      .select({ id: organizations.id, type: organizations.type })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    console.log("Organization query result:", org);
    if (org.length === 0) {
      console.log("Organization not found");
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    console.log("Checking admin membership for user:", inviter[0].id, "org:", orgId);
    const adminMembership = await db
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(
          eq(memberships.orgId, orgId),
          eq(memberships.userId, inviter[0].id),
          eq(memberships.role, "admin")
        )
      )
      .limit(1);

    console.log("Admin membership query result:", adminMembership);
    if (adminMembership.length === 0) {
      console.log("No admin membership found");
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    console.log("Creating invite with values:", {
      orgId,
      email,
      role,
      expiresAt,
      invitedBy: inviter[0].id,
      createdAt: now,
      updatedAt: now,
    });

    const [invite] = await db
      .insert(organizationInvites)
      .values({
        orgId,
        email,
        role,
        token: randomUUID(),
        expiresAt,
        invitedBy: inviter[0].id,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    console.log("Invite created successfully:", invite);

    const origin =
      process.env.NEXT_PUBLIC_BASE_URL ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      request.nextUrl.origin;

    const inviteLink = `${origin.replace(/\/$/, "")}/register/invite?token=${invite.token}`;

    return NextResponse.json({ inviteLink, invite });
  } catch (error) {
    console.error("POST /api/invite/create error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      error
    });
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

