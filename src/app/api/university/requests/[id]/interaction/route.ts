import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  universityAuthorizations,
  universityPartnerMeta,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

type InteractionPayload = {
  note: string;
  kind?: "call" | "email" | "meeting" | "other";
  occurredAt?: string | null; // ISO datetime string
};

function cleanInteractionPayload(body: any): InteractionPayload | null {
  if (!body || typeof body.note !== "string" || !body.note.trim()) {
    return null;
  }

  const note = body.note.trim();

  const rawKind = typeof body.kind === "string" ? body.kind : "other";
  const allowedKinds = new Set(["call", "email", "meeting", "other"]);
  const kind = allowedKinds.has(rawKind) ? rawKind : "other";

  const occurredAt =
    typeof body.occurredAt === "string" && body.occurredAt.trim().length > 0
      ? body.occurredAt
      : null;

  return { note, kind, occurredAt };
}

// GET: return the current internalNotes snapshot for this partner–university relation
export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await ctx.params;
    const idNum = parseInt(id, 10);
    if (!idNum || Number.isNaN(idNum)) {
      return NextResponse.json(
        { error: "Invalid id" },
        { status: 400 },
      );
    }

    // Ensure the authorization row exists
    const [authRow] = await db
      .select({
        id: universityAuthorizations.id,
        universityOrgId: universityAuthorizations.universityOrgId,
        companyOrgId: universityAuthorizations.companyOrgId,
      })
      .from(universityAuthorizations)
      .where(eq(universityAuthorizations.id, idNum))
      .limit(1);

    if (!authRow) {
      return NextResponse.json(
        { error: "Authorization not found" },
        { status: 404 },
      );
    }

    const [metaRow] = await db
      .select({
        id: universityPartnerMeta.id,
        internalNotes: universityPartnerMeta.internalNotes,
        lastMeetingDate: universityPartnerMeta.lastMeetingDate,
        createdAt: universityPartnerMeta.createdAt,
        updatedAt: universityPartnerMeta.updatedAt,
      })
      .from(universityPartnerMeta)
      .where(eq(universityPartnerMeta.authorizationId, authRow.id))
      .limit(1);

    if (!metaRow || !metaRow.internalNotes) {
      return NextResponse.json({
        interactions: [],
      });
    }

    // MVP: treat internalNotes as one big log blob, surface as a single "interaction"
    return NextResponse.json({
      interactions: [
        {
          id: metaRow.id,
          note: metaRow.internalNotes,
          kind: "other",
          occurredAt: metaRow.lastMeetingDate,
          createdAt: metaRow.createdAt,
          updatedAt: metaRow.updatedAt,
        },
      ],
    });
  } catch (e) {
    console.error(
      "GET /api/university/requests/[id]/interaction error:",
      e,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST: append a new interaction into internalNotes (MVP "log interactions")
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await ctx.params;
    const idNum = parseInt(id, 10);
    if (!idNum || Number.isNaN(idNum)) {
      return NextResponse.json(
        { error: "Invalid id" },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const payload = cleanInteractionPayload(body);

    if (!payload) {
      return NextResponse.json(
        { error: "note is required" },
        { status: 400 },
      );
    }

    // Ensure the authorization row exists
    const [authRow] = await db
      .select({
        id: universityAuthorizations.id,
        universityOrgId: universityAuthorizations.universityOrgId,
        companyOrgId: universityAuthorizations.companyOrgId,
      })
      .from(universityAuthorizations)
      .where(eq(universityAuthorizations.id, idNum))
      .limit(1);

    if (!authRow) {
      return NextResponse.json(
        { error: "Authorization not found" },
        { status: 404 },
      );
    }

    // Fetch existing meta row (if any)
    const [existingMeta] = await db
      .select({
        id: universityPartnerMeta.id,
        internalNotes: universityPartnerMeta.internalNotes,
      })
      .from(universityPartnerMeta)
      .where(eq(universityPartnerMeta.authorizationId, authRow.id))
      .limit(1);

    const now = new Date();
    const occurredAtDate = payload.occurredAt
      ? new Date(payload.occurredAt)
      : now;

    const header = `[${occurredAtDate.toISOString().slice(0, 10)} ${
      payload.kind ?? "other"
    }] (${session.user.email})`;
    const newEntry = `${header}\n${payload.note}\n`;

    const combinedNotes = existingMeta?.internalNotes
      ? `${existingMeta.internalNotes.trim()}\n\n${newEntry}`
      : newEntry;

    if (existingMeta) {
      await db
        .update(universityPartnerMeta)
        .set({
          internalNotes: combinedNotes,
          lastMeetingDate: occurredAtDate.toISOString().slice(0, 10),
          updatedAt: now,
        })
        .where(eq(universityPartnerMeta.id, existingMeta.id));
    } else {
      await db.insert(universityPartnerMeta).values({
        authorizationId: authRow.id,
        universityOrgId: authRow.universityOrgId,
        companyOrgId: authRow.companyOrgId,
        internalNotes: combinedNotes,
        lastMeetingDate: occurredAtDate.toISOString().slice(0, 10),
        // priority will default to "normal"
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(
      "POST /api/university/requests/[id]/interaction error:",
      e,
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
