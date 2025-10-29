import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizationInvites, memberships, users, organizations } from "@/db/schema-pg";
import { and, eq } from "drizzle-orm";

interface AcceptInviteBody {
  token?: string;
  name?: string;
  email?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: AcceptInviteBody = await request.json();
    const token = body.token?.trim();
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();

    if (!token) {
      return NextResponse.json({ error: "Invite token is required" }, { status: 400 });
    }

    if (!name || !email) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const now = new Date();

    const result = await db.transaction(async (tx) => {
      const inviteRows = await tx
        .select({
          id: organizationInvites.id,
          token: organizationInvites.token,
          email: organizationInvites.email,
          role: organizationInvites.role,
          expiresAt: organizationInvites.expiresAt,
          accepted: organizationInvites.accepted,
          orgId: organizationInvites.orgId,
        })
        .from(organizationInvites)
        .where(eq(organizationInvites.token, token))
        .limit(1);

      if (inviteRows.length === 0) {
        return NextResponse.json({ error: "Invite not found" }, { status: 404 });
      }

      const invite = inviteRows[0];

      if (invite.accepted) {
        return NextResponse.json({ error: "Invite already accepted" }, { status: 409 });
      }

      if (invite.expiresAt && invite.expiresAt <= now) {
        return NextResponse.json({ error: "Invite has expired" }, { status: 410 });
      }

      if (invite.email && invite.email.toLowerCase() !== email) {
        return NextResponse.json({ error: "Invite email does not match" }, { status: 400 });
      }

      const orgRows = await tx
        .select({ id: organizations.id, type: organizations.type })
        .from(organizations)
        .where(eq(organizations.id, invite.orgId))
        .limit(1);

      if (orgRows.length === 0) {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      }

      const existingUsers = await tx
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      let userId: number;

      if (existingUsers.length === 0) {
        const [created] = await tx
          .insert(users)
          .values({
            email,
            name,
            accountType: "employer",
            createdAt: now,
            updatedAt: now,
          })
          .returning();
        userId = created.id;
      } else {
        const current = existingUsers[0];
        userId = current.id;

        await tx
          .update(users)
          .set({
            name,
            accountType: "employer",
            updatedAt: now,
          })
          .where(eq(users.id, current.id));
      }

      const membershipExisting = await tx
        .select()
        .from(memberships)
        .where(
          and(eq(memberships.orgId, invite.orgId), eq(memberships.userId, userId))
        )
        .limit(1);

      if (membershipExisting.length === 0) {
        await tx.insert(memberships).values({
          orgId: invite.orgId,
          userId,
          role: invite.role ?? "member",
          status: "active",
          createdAt: now,
          updatedAt: now,
        });
      } else {
        await tx
          .update(memberships)
          .set({
            role: invite.role ?? membershipExisting[0].role,
            status: "active",
            updatedAt: now,
          })
          .where(eq(memberships.id, membershipExisting[0].id));
      }

      await tx
        .update(organizationInvites)
        .set({
          accepted: true,
          acceptedAt: now,
          updatedAt: now,
        })
        .where(eq(organizationInvites.id, invite.id));

      return NextResponse.json({
        ok: true,
        orgId: invite.orgId,
        role: invite.role ?? "member",
      });
    });

    // result holds the NextResponse returned inside the transaction
    return result;
  } catch (error) {
    console.error("POST /api/invite/accept error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

