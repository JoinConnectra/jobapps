// src/app/api/student/inbox/threads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gt, ilike } from "drizzle-orm";

import { db } from "@/db";
import { inboxThreads, organizations, users } from "@/db/schema-pg";
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

function mapRowToConversation(row: {
  thread: typeof inboxThreads.$inferSelect;
  orgName: string | null;
}): Conversation {
  const t = row.thread;
  const lastTs = t.lastMessageAt ?? t.createdAt;

  const isEmployer = t.portal === "employer";
  const isUniversity = t.portal === "university";

  // Title = org name; fall back nicely based on portal
  const baseName =
    row.orgName ||
    (isEmployer ? "Employer" : isUniversity ? "Career center" : "Contact");

  const title = baseName;
  const participants: string[] = [baseName];

  // Primary label based on who is talking to the student
  const primaryLabel = isEmployer
    ? "Employer"
    : isUniversity
    ? "Career center"
    : "Contact";

  const labels: string[] = [primaryLabel];

  // Merge in any additional labels, but strip internal/duplicate ones
  if (Array.isArray(t.labels)) {
    for (const raw of t.labels) {
      const l = raw || "";
      const lower = l.toLowerCase();
      if (!l) continue;
      if (lower === "candidate") continue; // that's the student themself
      if (lower.startsWith("org:")) continue; // internal routing
      if (labels.includes(l)) continue;
      labels.push(l);
    }
  }

  return {
    id: String(t.id),
    title,
    preview: t.lastMessageSnippet ?? "",
    unreadCount: t.unreadCount ?? 0,
    starred: t.starred ?? false,
    archived: t.archived ?? false,
    deleted: false,
    labels,
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

  const conditions = [
    // Any thread (employer or university) where this candidate is the counterparty
    eq(inboxThreads.counterpartyUserId, me.id),
  ];

  // Tab filters
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

  // Simple text search on subject (you can later add orgName if you want)
  if (q) {
    const pattern = `%${q.toLowerCase()}%`;
    conditions.push(ilike(inboxThreads.subject, pattern));
  }

  const rows = await db
    .select({
      thread: inboxThreads,
      orgName: organizations.name,
    })
    .from(inboxThreads)
    .leftJoin(organizations, eq(inboxThreads.orgId, organizations.id))
    .where(and(...conditions))
    .orderBy(
      desc(inboxThreads.lastMessageAt),
      desc(inboxThreads.createdAt),
    );

  const conversations = rows.map(mapRowToConversation);

  return NextResponse.json({ conversations });
}
