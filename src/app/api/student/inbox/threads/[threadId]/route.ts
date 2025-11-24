// src/app/api/student/inbox/threads/[threadId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { inboxMessages, inboxThreads, users } from "@/db/schema-pg";
import { getCurrentUser } from "@/lib/auth";

type Message = {
  id: string;
  body: string;
  sentAt: number;
  mine: boolean;
  fromName?: string | null;
};

async function getDbUserOrResp(req: NextRequest) {
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
  if (dbUser.accountType !== "applicant") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return dbUser;
}

// GET all messages in a thread for a student
export async function GET(
  req: NextRequest,
  { params }: { params: { threadId: string } },
) {
  const dbUserOrResp = await getDbUserOrResp(req);
  if (dbUserOrResp instanceof NextResponse) return dbUserOrResp;
  const me = dbUserOrResp;

  const threadId = Number(params.threadId);

  if (!threadId || Number.isNaN(threadId)) {
    return NextResponse.json(
      { error: "threadId required" },
      { status: 400 },
    );
  }

  // Safety check: ensure this thread belongs to this candidate
  const [thread] = await db
    .select()
    .from(inboxThreads)
    .where(eq(inboxThreads.id, threadId))
    .limit(1);

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }
  if (Number(thread.counterpartyUserId) !== me.id) {
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
    // For candidate view, outgoing = from_role = 'candidate'
    mine: m.fromRole === "candidate",
    fromName: m.fromName,
  }));

  return NextResponse.json({ messages });
}

// POST a new message into the thread (candidate side)
export async function POST(
  req: NextRequest,
  { params }: { params: { threadId: string } },
) {
  const dbUserOrResp = await getDbUserOrResp(req);
  if (dbUserOrResp instanceof NextResponse) return dbUserOrResp;
  const me = dbUserOrResp;

  const body = await req.json().catch(() => null);
  const { text } = body ?? {};

  const threadId = Number(params.threadId);

  if (!text || !threadId || Number.isNaN(threadId)) {
    return NextResponse.json(
      { error: "text and valid threadId are required" },
      { status: 400 },
    );
  }

  // Load thread to get orgId + verify ownership
  const [thread] = await db
    .select()
    .from(inboxThreads)
    .where(eq(inboxThreads.id, threadId))
    .limit(1);

  if (!thread) {
    return NextResponse.json({ error: "Thread not found" }, { status: 404 });
  }
  if (Number(thread.counterpartyUserId) !== me.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();

  // Insert message as outgoing from candidate
  const [msg] = await db
    .insert(inboxMessages)
    .values({
      threadId,
      orgId: thread.orgId,
      body: text,
      fromRole: "candidate",
      direction: "outgoing",
      isInternalNote: false,
      createdAt: now,
      updatedAt: now,
      fromUserId: me.id,
      fromName: null,
      fromEmail: null,
    })
    .returning();

  // Update thread snippet / timestamps, bump unreadCount (for employer side)
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
