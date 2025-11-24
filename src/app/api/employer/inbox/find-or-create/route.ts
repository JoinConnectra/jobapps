// src/app/api/employer/inbox/find-or-create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { inboxThreads } from "@/db/schema-pg";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { studentUserId, studentName, orgId } = body ?? {};

  if (!studentUserId || !orgId) {
    return NextResponse.json(
      { error: "studentUserId and orgId required" },
      { status: 400 },
    );
  }

  const orgIdNum = Number(orgId);
  if (Number.isNaN(orgIdNum)) {
    return NextResponse.json(
      { error: "orgId must be a number" },
      { status: 400 },
    );
  }

  // 1. Try find existing thread between this org + candidate in employer portal
  const existing = await db
    .select()
    .from(inboxThreads)
    .where(
      and(
        eq(inboxThreads.orgId, orgIdNum),
        eq(inboxThreads.counterpartyUserId, studentUserId),
        eq(inboxThreads.portal, "employer" as any),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json({ threadId: existing[0].id });
  }

  // 2. Create new thread
  const niceName = studentName || "Candidate";
  const subject = `Candidate · ${niceName}`;

  const [thread] = await db
    .insert(inboxThreads)
    .values({
      orgId: orgIdNum,
      portal: "employer",
      subject,
      counterpartyUserId: studentUserId,
      counterpartyType: "candidate",
      counterpartyName: studentName ?? null,
      unreadCount: 0,
      labels: ["candidate"],
    })
    .returning();

  return NextResponse.json({ threadId: thread.id });
}
