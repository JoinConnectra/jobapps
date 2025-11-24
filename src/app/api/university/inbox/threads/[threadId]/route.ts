// src/app/api/university/inbox/threads/[threadId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { asc, eq, and } from "drizzle-orm";

import { db } from "@/db";
import {
  inboxMessages,
  inboxThreads,
  users,
  organizations,
  memberships,
} from "@/db/schema-pg";
import { getCurrentUser } from "@/lib/auth";

type Message = {
  id: string;
  body: string;
  sentAt: number;
  mine: boolean;
  fromName?: string | null;
};

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

// GET all messages in a thread for a university org
export async function GET(
  req: NextRequest,
  { params }: { params: { threadId: string } },
) {
  const uniOrResp = await getUniUserAndOrgOrResp(req);
  if (uniOrResp instanceof NextResponse) return uniOrResp;
  const { orgId } = uniOrResp;

  const threadId = Number(params.threadId);
  if (!threadId || Number.isNaN(threadId)) {
    return NextResponse.json(
      { error: "threadId required" },
      { status: 400 },
    );
  }

  const [thread] = await db
    .select()
    .from(inboxThreads)
    .where(eq(inboxThreads.id, threadId))
    .limit(1);

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }
  if (thread.orgId !== orgId || thread.portal !== "university") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select()
    .from(inboxMessages)
    .where(eq(inboxMessages.threadId, threadId))
    .orderBy(asc(inboxMessages.createdAt));

  const messages: Message[] = rows.map((m) => ({
    id: String(m.id),
    body: m.body,
    sentAt: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
    // For university view, outgoing = from_role = 'university'
    mine: m.fromRole === "university",
    fromName: m.fromName,
  }));

  return NextResponse.json({ messages });
}

// POST a new message into the thread (university side)
export async function POST(
  req: NextRequest,
  { params }: { params: { threadId: string } },
) {
  const uniOrResp = await getUniUserAndOrgOrResp(req);
  if (uniOrResp instanceof NextResponse) return uniOrResp;
  const { user, orgId } = uniOrResp;

  const body = await req.json().catch(() => null);
  const { text } = body ?? {};

  const threadId = Number(params.threadId);
  if (!text || !threadId || Number.isNaN(threadId)) {
    return NextResponse.json(
      { error: "text and valid threadId are required" },
      { status: 400 },
    );
  }

  const [thread] = await db
    .select()
    .from(inboxThreads)
    .where(eq(inboxThreads.id, threadId))
    .limit(1);

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }
  if (thread.orgId !== orgId || thread.portal !== "university") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();

  const [msg] = await db
    .insert(inboxMessages)
    .values({
      threadId,
      orgId: thread.orgId,
      body: text,
      fromRole: "university",
      direction: "outgoing",
      isInternalNote: false,
      createdAt: now,
      updatedAt: now,
      fromUserId: user.id,
      fromName: null,
      fromEmail: null,
    })
    .returning();

  await db
    .update(inboxThreads)
    .set({
      lastMessageAt: now,
      lastMessageSnippet: text,
      unreadCount: (thread.unreadCount ?? 0) + 1,
      updatedAt: now,
    })
    .where(eq(inboxThreads.id, threadId));

  return NextResponse.json({
    id: String(msg.id),
    body: msg.body,
    sentAt: now.getTime(),
    mine: true,
  });
}
