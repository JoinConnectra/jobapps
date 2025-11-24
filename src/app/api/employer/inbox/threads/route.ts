// src/app/api/employer/inbox/threads/route.ts
import { NextRequest, NextResponse } from "next/server";
import { desc, or, and, eq } from "drizzle-orm";

import { db } from "@/db";
import { inboxThreads, organizations } from "@/db/schema-pg";

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

type ThreadRow = {
  thread: typeof inboxThreads.$inferSelect;
  orgName: string | null;
};

function mapRowToConversation(row: ThreadRow): Conversation {
  const t = row.thread;
  const lastTs = t.lastMessageAt ?? t.createdAt;

  let title: string;
  let participants: string[] = [];
  let labels = [...(t.labels ?? [])];
  let counterpartyName: string | null = null;
  let counterpartyType: string | null = t.counterpartyType ?? null;

  if (t.portal === "university") {
    // 👀 Employer POV:
    // This thread is OWNED by a university org (t.orgId).
    // From the company side, the COUNTERPARTY should be that university org.
    counterpartyName = row.orgName || "College partner";
    counterpartyType = "college";
    title = counterpartyName;
    participants = [counterpartyName];

    // Add a college label for nice UI
    if (!labels.includes("college")) labels.push("college");
  } else if (t.counterpartyType === "candidate") {
    // Normal employer-owned candidate thread
    counterpartyName = t.counterpartyName || t.subject || "Candidate";
    counterpartyType = "candidate";
    title = `Candidate · ${counterpartyName}`;
    participants = [counterpartyName];

    if (!labels.includes("candidate")) labels.push("candidate");
  } else {
    // Other employer-owned threads (if any in future)
    counterpartyName = t.counterpartyName || t.subject || "Conversation";
    title = counterpartyName;
    if (counterpartyName) participants = [counterpartyName];
  }

  return {
    id: String(t.id),
    title,
    preview: t.lastMessageSnippet ?? "",
    unreadCount: t.unreadCount ?? 0,
    starred: t.starred ?? false,
    archived: t.archived ?? false,
    labels,
    lastActivity: lastTs ? new Date(lastTs).getTime() : Date.now(),
    participants,
    counterparty: counterpartyName
      ? {
          name: counterpartyName,
          type: counterpartyType,
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
  //  - employer-owned threads for this org
  //  - university threads (for cross-org conversations),
  //    joined with organizations so we know the OWNER org name (uni name).
  const rowsRaw: ThreadRow[] = await db
    .select({
      thread: inboxThreads,
      orgName: organizations.name,
    })
    .from(inboxThreads)
    .leftJoin(organizations, eq(inboxThreads.orgId, organizations.id))
    .where(
      or(
        and(
          eq(inboxThreads.orgId, orgId),
          eq(inboxThreads.portal, "employer" as any),
        ),
        eq(inboxThreads.portal, "university" as any),
      ),
    )
    .orderBy(
      desc(inboxThreads.lastMessageAt),
      desc(inboxThreads.createdAt),
    );

  // Keep only:
  //  - employer threads belonging to this org
  //  - university threads whose labels contain org:<orgId>
  const rows = rowsRaw.filter(({ thread }) => {
    if (thread.portal === "employer") {
      return thread.orgId === orgId;
    }
    if (thread.portal === "university") {
      const labels = thread.labels ?? [];
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
