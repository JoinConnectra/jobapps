// src/app/api/employer/inbox/threads/[threadId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { inboxMessages, inboxThreads } from "@/db/schema-pg";

type Message = {
  id: string;
  body: string;
  sentAt: number;
  mine: boolean;
  fromName?: string | null;
};

function canAccessThread(
  thread: typeof inboxThreads.$inferSelect,
  employerOrgId: number,
) {
  const labelForThisOrg = `org:${employerOrgId}`;

  if (thread.portal === "employer") {
    return thread.orgId === employerOrgId;
  }

  if (thread.portal === "university") {
    const labels = thread.labels ?? [];
    return labels.includes(labelForThisOrg);
  }

  return false;
}

// GET all messages in a thread for an employer org
export async function GET(
  req: NextRequest,
  // NOTE: params is now a Promise in Next 15 dynamic route handlers
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { searchParams } = new URL(req.url);
  const orgIdParam = searchParams.get("orgId");
  const employerOrgId = orgIdParam ? Number(orgIdParam) : NaN;

  // ✅ await params before using threadId
  const { threadId: threadIdStr } = await params;
  const threadId = Number(threadIdStr);

  if (
    !employerOrgId ||
    Number.isNaN(employerOrgId) ||
    !threadId ||
    Number.isNaN(threadId)
  ) {
    return NextResponse.json(
      { error: "orgId and threadId required" },
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

  if (!canAccessThread(thread, employerOrgId)) {
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
    // Employer side: mine if from_role = 'employer'
    mine: m.fromRole === "employer",
    fromName:
      m.fromRole === "employer"
        ? "You"
        : m.fromRole === "university"
        ? "University"
        : m.fromRole === "candidate"
        ? "Candidate"
        : m.fromName,
  }));

  return NextResponse.json({ messages });
}

// POST a new message into the thread (employer side)
export async function POST(
  req: NextRequest,
  // NOTE: params is a Promise here as well
  { params }: { params: Promise<{ threadId: string }> },
) {
  const body = await req.json().catch(() => null);
  const { text, orgId } = body ?? {};

  const employerOrgId = Number(orgId);
  const { threadId: threadIdStr } = await params;
  const threadId = Number(threadIdStr);

  if (!text || !employerOrgId || Number.isNaN(employerOrgId) || Number.isNaN(threadId)) {
    return NextResponse.json(
      { error: "text and orgId are required" },
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

  if (!canAccessThread(thread, employerOrgId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();

  // Insert message as outgoing from employer
  const [msg] = await db
    .insert(inboxMessages)
    .values({
      threadId,
      // Keep orgId as the owner org for the thread (university for uni-owned threads)
      orgId: thread.orgId,
      body: text,
      fromRole: "employer",
      direction: "outgoing",
      isInternalNote: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Update thread snippet / timestamps, increment unreadCount for the other side
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
