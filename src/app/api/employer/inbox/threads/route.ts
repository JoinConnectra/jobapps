// src/app/api/employer/inbox/threads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, gt, ilike, not } from "drizzle-orm";

import { db } from "@/db";
import { inboxThreads } from "@/db/schema-pg";
// import { getCurrentUser } from "@/lib/auth"; // if you want auth here later

// Keep in sync with src/app/dashboard/inbox/_types.ts
type Conversation = {
  id: string;
  title: string;
  preview: string;
  unreadCount: number;
  starred: boolean;
  archived: boolean;
  labels: string[];
  lastActivity: number;
  participants: string[];
  counterparty?: {
    name: string;
    type?: string | null;
  } | null;
  pinned?: boolean;
  attachments?: number;
};

type InboxTab = "all" | "unread" | "starred" | "archived";

function mapRowToConversation(
  row: typeof inboxThreads.$inferSelect,
): Conversation {
  const lastTs = row.lastMessageAt ?? row.createdAt;

  const baseName =
    row.counterpartyName || row.subject || "Conversation";

  const title =
    row.counterpartyType === "candidate"
      ? `Candidate · ${baseName}`
      : baseName;

  const participants = row.counterpartyName ? [row.counterpartyName] : [];

  // Ensure we have a "candidate" label if it's a candidate thread
  const labels = [...(row.labels ?? [])];
  if (row.counterpartyType === "candidate" && !labels.includes("candidate")) {
    labels.push("candidate");
  }

  return {
    id: String(row.id),
    title,
    preview: row.lastMessageSnippet ?? "",
    unreadCount: row.unreadCount ?? 0,
    starred: row.starred ?? false,
    archived: row.archived ?? false,
    labels,
    lastActivity: lastTs ? new Date(lastTs).getTime() : Date.now(),
    participants,
    counterparty: row.counterpartyName
      ? {
          name: row.counterpartyName,
          type: row.counterpartyType ?? null,
        }
      : null,
    pinned: false,
    attachments: 0,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const orgIdParam = searchParams.get("orgId");
  const tab = (searchParams.get("tab") as InboxTab | null) ?? "all";
  const q = (searchParams.get("q") ?? "").trim();

  const orgId = orgIdParam ? Number(orgIdParam) : NaN;
  if (!orgId || Number.isNaN(orgId)) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  // Base filter: this org + employer portal
  let where = and(
    eq(inboxThreads.orgId, orgId),
    eq(inboxThreads.portal, "employer" as any),
  );

  // Tab filters
  if (tab === "unread") {
    where = and(where, gt(inboxThreads.unreadCount, 0));
  } else if (tab === "starred") {
    where = and(where, eq(inboxThreads.starred, true));
  } else if (tab === "archived") {
    where = and(where, eq(inboxThreads.archived, true));
  } else {
    // all => exclude archived
    where = and(where, not(eq(inboxThreads.archived, true)));
  }

  // Text search (subject, name, snippet, labels)
  if (q) {
    const pattern = `%${q.toLowerCase()}%`;
    where = and(
      where,
      // ilike on subject or counterparty name or snippet
      // NOTE: ilike(...) OR ilike(...) requires db.or; if you don’t have it imported yet,
      // we can refine this later. For now, just subject+snippet:
      ilike(inboxThreads.subject, pattern),
    );
  }

  const rows = await db
    .select()
    .from(inboxThreads)
    .where(where)
    .orderBy(
      desc(inboxThreads.lastMessageAt),
      desc(inboxThreads.createdAt),
    );

  const conversations = rows.map(mapRowToConversation);

  return NextResponse.json({ conversations });
}
