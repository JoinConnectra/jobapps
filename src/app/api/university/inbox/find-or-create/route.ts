// src/app/api/university/inbox/find-or-create/route.ts
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
    return NextResponse.json({ error: "No DB user for email" }, { status: 401 });
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
  const { companyOrgId } = body ?? {};
  if (!companyOrgId) {
    return NextResponse.json(
      { error: "companyOrgId required" },
      { status: 400 },
    );
  }

  // Look up company org (for nicer subject / name)
  const [companyOrg] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
    })
    .from(organizations)
    .where(eq(organizations.id, Number(companyOrgId)))
    .limit(1);

  const labelForCompany = `org:${companyOrgId}`;

  // Try to find an existing thread owned by this university,
  // targeted at this company (encoded in labels).
  const existing = await db
    .select()
    .from(inboxThreads)
    .where(
      and(
        eq(inboxThreads.orgId, universityOrgId),
        eq(inboxThreads.portal, "university" as any),
      ),
    )
    .limit(100); // small cap; then filter in JS

  const found = existing.find((t) =>
    (t.labels ?? []).includes(labelForCompany),
  );

  if (found) {
    return NextResponse.json({ threadId: found.id });
  }

  // Create a new thread owned by the university portal
  const now = new Date();
  const subjectBase = companyOrg?.name || "Company";
  const [thread] = await db
    .insert(inboxThreads)
    .values({
      orgId: universityOrgId,
      portal: "university",
      subject: `Company · ${subjectBase}`,
      counterpartyUserId: null,
      counterpartyName: companyOrg?.name ?? null,
      counterpartyEmail: null,
      counterpartyType: "employer",
      archived: false,
      starred: false,
      labels: ["company", labelForCompany],
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
