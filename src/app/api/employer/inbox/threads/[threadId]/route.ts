// src/app/api/employer/inbox/threads/[threadId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { inboxMessages, inboxThreads } from "@/db/schema-pg";

type Message = {
  id: string;
  body: string;
  sentAt: number;
  mine: boolean;
  fromName?: string | null;
};

// GET all messages in a thread for an org
export async function GET(
  req: NextRequest,
  // NOTE: params is now a Promise in Next 15 dynamic route handlers
  { params }: { params: Promise<{ threadId: string }> },
) {
  const { searchParams } = new URL(req.url);
  const orgIdParam = searchParams.get("orgId");
  const orgId = orgIdParam ? Number(orgIdParam) : NaN;

  // ✅ await params before using threadId
  const { threadId: threadIdStr } = await params;
  const threadId = Number(threadIdStr);

  if (!orgId || Number.isNaN(orgId) || !threadId || Number.isNaN(threadId)) {
    return NextResponse.json(
      { error: "orgId and threadId required" },
      { status: 400 },
    );
  }

  const rows = await db
    .select()
    .from(inboxMessages)
    .where(
      and(
        eq(inboxMessages.orgId, orgId),
        eq(inboxMessages.threadId, threadId),
      ),
    )
    .orderBy(asc(inboxMessages.createdAt));

  const messages: Message[] = rows.map((m) => ({
    id: String(m.id),
    body: m.body,
    sentAt: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
    // For now, mark outgoing if from_role = 'employer'
    mine: m.fromRole === "employer",
    fromName: m.fromName,
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

  // ✅ await params before using threadId
  const { threadId: threadIdStr } = await params;
  const threadId = Number(threadIdStr);

  if (!text || !orgId || Number.isNaN(Number(orgId)) || Number.isNaN(threadId)) {
    return NextResponse.json(
      { error: "text and orgId are required" },
      { status: 400 },
    );
  }

  const now = new Date();

  // Insert message as outgoing from employer
  const [msg] = await db
    .insert(inboxMessages)
    .values({
      threadId,
      orgId: Number(orgId),
      body: text,
      fromRole: "employer",
      direction: "outgoing",
      isInternalNote: false,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  // Update thread snippet / timestamps, reset unreadCount for org side
  await db
    .update(inboxThreads)
    .set({
      lastMessageAt: now,
      lastMessageSnippet: text,
      unreadCount: 0,
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
