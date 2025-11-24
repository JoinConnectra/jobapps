// src/app/api/employer/inbox/threads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { desc, or, and, eq } from "drizzle-orm";

import { db } from "@/db";
import { inboxThreads } from "@/db/schema-pg";

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

  const baseName = row.counterpartyName || row.subject || "Conversation";

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
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();

  const orgId = orgIdParam ? Number(orgIdParam) : NaN;
  if (!orgId || Number.isNaN(orgId)) {
    return NextResponse.json({ error: "orgId is required" }, { status: 400 });
  }

  const labelForThisOrg = `org:${orgId}`;

  // Fetch:
  //  - all employer-owned threads for this org
  //  - all university threads (we'll filter by labels in JS)
  const rowsRaw = await db
    .select()
    .from(inboxThreads)
    .where(
      or(
        and(
          eq(inboxThreads.orgId, orgId),
          eq(inboxThreads.portal, "employer" as any),
        ),
        eq(inboxThreads.portal, "university" as any),
      ),
    )
    .orderBy(desc(inboxThreads.lastMessageAt), desc(inboxThreads.createdAt));

  // Keep only:
  //  - employer threads belonging to this org
  //  - university threads whose labels contain org:<orgId>
  const rows = rowsRaw.filter((row) => {
    if (row.portal === "employer") {
      return row.orgId === orgId;
    }
    if (row.portal === "university") {
      const labels = row.labels ?? [];
      return labels.includes(labelForThisOrg);
    }
    return false;
  });

  let conversations = rows.map(mapRowToConversation);

  // Tab filters
  conversations = conversations.filter((c) => {
    if (tab === "unread" && c.unreadCount === 0) return false;
    if (tab === "starred" && !c.starred) return false;
    if (tab === "archived" && !c.archived) return false;
    if (tab !== "archived" && c.archived) return false;
    return true;
  });

  // Text search: title, preview, participants, labels, counterparty name
  if (q) {
    conversations = conversations.filter((c) => {
      const title = c.title.toLowerCase();
      const preview = (c.preview || "").toLowerCase();
      const labels = (c.labels || []).map((l) => l.toLowerCase());
      const participants = c.participants.map((p) => p.toLowerCase());
      const counterpartyName = c.counterparty?.name
        ? c.counterparty.name.toLowerCase()
        : "";

      return (
        title.includes(q) ||
        preview.includes(q) ||
        participants.some((p) => p.includes(q)) ||
        labels.some((l) => l.includes(q)) ||
        counterpartyName.includes(q)
      );
    });
  }

  // Ensure newest first based on lastActivity
  conversations.sort((a, b) => b.lastActivity - a.lastActivity);

  return NextResponse.json({ conversations });
}
