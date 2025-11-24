// src/app/api/university/inbox/threads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gt, ilike } from "drizzle-orm";

import { db } from "@/db";
import {
  inboxThreads,
  users,
  organizations,
  memberships,
} from "@/db/schema-pg";
import { getCurrentUser } from "@/lib/auth";

type InboxTab = "all" | "unread" | "starred" | "archived";

// Keep in sync with src/app/university/dashboard/inbox/_types.ts
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

  // Find a university org this user belongs to
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

function mapRowToConversation(
  row: typeof inboxThreads.$inferSelect,
): Conversation {
  const lastTs = row.lastMessageAt ?? row.createdAt;

  const baseTitle = row.subject || "Conversation";

  // For university portal, show counterparty name/email (candidate or employer)
  const participants: string[] = [];
  if (row.counterpartyName) participants.push(row.counterpartyName);
  if (!participants.length && row.counterpartyEmail) participants.push(row.counterpartyEmail);
  if (!participants.length) participants.push("Contact");

  return {
    id: String(row.id),
    title: baseTitle,
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
  const uniOrResp = await getUniUserAndOrgOrResp(req);
  if (uniOrResp instanceof NextResponse) return uniOrResp;
  const { orgId } = uniOrResp;

  const { searchParams } = new URL(req.url);
  const tab = (searchParams.get("tab") as InboxTab | null) ?? "all";
  const q = (searchParams.get("q") ?? "").trim();

  const conditions = [
    eq(inboxThreads.orgId, orgId),
    eq(inboxThreads.portal, "university" as any),
  ];

  if (tab === "unread") {
    conditions.push(gt(inboxThreads.unreadCount, 0));
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

  if (q) {
    const pattern = `%${q.toLowerCase()}%`;
    conditions.push(ilike(inboxThreads.subject, pattern));
  }

  const rows = await db
    .select()
    .from(inboxThreads)
    .where(and(...conditions))
    .orderBy(desc(inboxThreads.lastMessageAt), desc(inboxThreads.createdAt));

  const conversations = rows.map(mapRowToConversation);

  return NextResponse.json({ conversations });
}
