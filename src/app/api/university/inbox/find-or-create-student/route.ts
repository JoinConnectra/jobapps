// src/app/api/university/inbox/find-or-create-student/route.ts
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  inboxThreads,
  organizations,
  memberships,
  users,
} from "@/db/schema-pg";
import { getCurrentUser } from "@/lib/auth";

async function getUniUserAndOrgOrResp(req: NextRequest) {
  const authUser = await getCurrentUser(req);
  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [dbUser] = await db
    .select({
      id: users.id,
      email: users.email,
      accountType: users.accountType,
    })
    .from(users)
    .where(eq(users.email, authUser.email))
    .limit(1);

  if (!dbUser) {
    return NextResponse.json(
      { error: "No DB user for email" },
      { status: 401 },
    );
  }

  const [membershipRow] = await db
    .select({
      orgId: memberships.orgId,
      orgType: organizations.type,
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.orgId, organizations.id))
    .where(
      and(
        eq(memberships.userId, dbUser.id),
        eq(organizations.type, "university"),
      ),
    )
    .limit(1);

  if (!membershipRow || membershipRow.orgType !== "university") {
    return NextResponse.json(
      { error: "No university organization for this user" },
      { status: 403 },
    );
  }

  return { user: dbUser, orgId: membershipRow.orgId };
}

export async function POST(req: NextRequest) {
  const uniOrResp = await getUniUserAndOrgOrResp(req);
  if (uniOrResp instanceof NextResponse) return uniOrResp;
  const { orgId: universityOrgId } = uniOrResp;

  const body = await req.json().catch(() => null);
  const { studentUserId, studentName } = body ?? {};

  if (!studentUserId) {
    return NextResponse.json(
      { error: "studentUserId required" },
      { status: 400 },
    );
  }

  const studentUserIdNum = Number(studentUserId);
  if (Number.isNaN(studentUserIdNum)) {
    return NextResponse.json(
      { error: "studentUserId must be a number" },
      { status: 400 },
    );
  }

  // 1. Try to find existing university-owned thread with this student as counterparty
  const existing = await db
    .select()
    .from(inboxThreads)
    .where(
      and(
        eq(inboxThreads.orgId, universityOrgId),
        eq(inboxThreads.portal, "university" as any),
        eq(inboxThreads.counterpartyUserId, studentUserIdNum),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ threadId: existing[0].id });
  }

  // 2. Create new thread
  const niceName = studentName || "Student";
  const subject = `Student · ${niceName}`;
  const now = new Date();

  const [thread] = await db
    .insert(inboxThreads)
    .values({
      orgId: universityOrgId,
      portal: "university",
      subject,
      counterpartyUserId: studentUserIdNum,
      counterpartyType: "candidate",
      counterpartyName: studentName ?? null,
      counterpartyEmail: null,
      archived: false,
      starred: false,
      labels: ["student"],
      unreadCount: 0,
      lastMessageAt: now,
      lastMessageSnippet: "",
      jobId: null,
      applicationId: null,
      eventId: null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return NextResponse.json({ threadId: thread.id });
}
