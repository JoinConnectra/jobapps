// src/app/api/student/inbox/threads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gt, ilike } from "drizzle-orm";

import { db } from "@/db";
import { inboxThreads, users } from "@/db/schema-pg";
import { getCurrentUser } from "@/lib/auth";

type InboxTab = "all" | "unread" | "starred" | "archived";

// Keep in sync with src/app/student/inbox/_types.ts
type Conversation = {
  id: string;
  title: string;
  participants: string[];
  preview: string;
  lastActivity: number;
  unreadCount: number;
  starred: boolean;
  archived: boolean;
  deleted: boolean;
  pinned?: boolean;
  labels: string[];
  attachments?: number;
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

function mapRowToConversation(
  row: typeof inboxThreads.$inferSelect,
): Conversation {
  const lastTs = row.lastMessageAt ?? row.createdAt;

  // For now, just use subject. Later we can join organizations to show company name.
  const baseTitle = row.subject || "Conversation";
  const title = baseTitle;

  // For candidate view, "participants" = employer/company (placeholder for now)
  const participants: string[] = ["Employer"];

  return {
    id: String(row.id),
    title,
    preview: row.lastMessageSnippet ?? "",
    unreadCount: row.unreadCount ?? 0,
    starred: row.starred ?? false,
    archived: row.archived ?? false,
    deleted: false,
    labels: row.labels ?? [],
    lastActivity: lastTs ? new Date(lastTs).getTime() : Date.now(),
    participants,
    pinned: false,
    attachments: 0,
  };
}

export async function GET(req: NextRequest) {
  const dbUserOrResp = await getDbUserOrResp(req);
  if (dbUserOrResp instanceof NextResponse) return dbUserOrResp;
  const me = dbUserOrResp;

  const { searchParams } = new URL(req.url);
  const tab = (searchParams.get("tab") as InboxTab | null) ?? "all";
  const q = (searchParams.get("q") ?? "").trim();

  // Build conditions as an array to avoid type issues with `where`
  const conditions = [
    // This candidate is the counterparty
    eq(inboxThreads.counterpartyUserId, me.id),
  ];

  // Tab filters
  if (tab === "unread") {
    conditions.push(gt(inboxThreads.unreadCount, 0));
    // and exclude archived
    conditions.push(eq(inboxThreads.archived, false));
  } else if (tab === "starred") {
    conditions.push(eq(inboxThreads.starred, true));
    conditions.push(eq(inboxThreads.archived, false));
  } else if (tab === "archived") {
    conditions.push(eq(inboxThreads.archived, true));
  } else {
    // "all" => exclude archived
    conditions.push(eq(inboxThreads.archived, false));
  }

  // Simple text search on subject
  if (q) {
    const pattern = `%${q.toLowerCase()}%`;
    conditions.push(ilike(inboxThreads.subject, pattern));
  }

  const rows = await db
    .select()
    .from(inboxThreads)
    .where(and(...conditions))
    .orderBy(
      desc(inboxThreads.lastMessageAt),
      desc(inboxThreads.createdAt),
    );

  const conversations = rows.map(mapRowToConversation);

  return NextResponse.json({ conversations });
}
