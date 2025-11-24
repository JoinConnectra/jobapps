import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  universityAuthorizations,
  universityPartnerMeta,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

type MetaPayload = {
  priority?: "high" | "normal" | "low" | "watch" | null;
  primaryContactName?: string | null;
  primaryContactEmail?: string | null;
  primaryContactRole?: string | null;
  primaryContactPhone?: string | null;
  lastMeetingDate?: string | null; // YYYY-MM-DD
  internalNotes?: string | null;
};

function cleanMetaPayload(body: any): MetaPayload {
  const rawPriority = body?.priority ?? null;
  const allowedPriorities = new Set(["high", "normal", "low", "watch"]);
  const safePriority =
    typeof rawPriority === "string" && allowedPriorities.has(rawPriority)
      ? (rawPriority as MetaPayload["priority"])
      : null;

  const primaryContactName =
    typeof body?.primaryContactName === "string"
      ? body.primaryContactName
      : null;

  const primaryContactEmail =
    typeof body?.primaryContactEmail === "string"
      ? body.primaryContactEmail
      : null;

  const primaryContactRole =
    typeof body?.primaryContactRole === "string"
      ? body.primaryContactRole
      : null;

  const primaryContactPhone =
    typeof body?.primaryContactPhone === "string"
      ? body.primaryContactPhone
      : null;

  const lastMeetingDate =
    typeof body?.lastMeetingDate === "string"
      ? body.lastMeetingDate
      : null;

  const internalNotes =
    typeof body?.internalNotes === "string" ? body.internalNotes : null;

  return {
    priority: safePriority,
    primaryContactName,
    primaryContactEmail,
    primaryContactRole,
    primaryContactPhone,
    lastMeetingDate,
    internalNotes,
  };
}

// GET: return meta snapshot for this partner–university relation
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
        priority: universityPartnerMeta.priority,
        primaryContactName: universityPartnerMeta.primaryContactName,
        primaryContactEmail: universityPartnerMeta.primaryContactEmail,
        primaryContactRole: universityPartnerMeta.primaryContactRole,
        primaryContactPhone: universityPartnerMeta.primaryContactPhone,
        lastMeetingDate: universityPartnerMeta.lastMeetingDate,
        internalNotes: universityPartnerMeta.internalNotes,
        createdAt: universityPartnerMeta.createdAt,
        updatedAt: universityPartnerMeta.updatedAt,
      })
      .from(universityPartnerMeta)
      .where(eq(universityPartnerMeta.authorizationId, authRow.id))
      .limit(1);

    if (!metaRow) {
      return NextResponse.json({
        meta: null,
      });
    }

    return NextResponse.json({
      meta: metaRow,
    });
  } catch (e) {
    console.error("GET /api/university/requests/[id]/meta error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST: upsert meta for this partner–university relation
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
    const meta = cleanMetaPayload(body);

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

    const [existingMeta] = await db
      .select({
        id: universityPartnerMeta.id,
      })
      .from(universityPartnerMeta)
      .where(eq(universityPartnerMeta.authorizationId, authRow.id))
      .limit(1);

    const now = new Date();

    if (existingMeta) {
      await db
        .update(universityPartnerMeta)
        .set({
          // only set fields that are non-undefined from payload
          ...(meta.priority !== undefined && {
            priority: meta.priority ?? "normal",
          }),
          ...(meta.primaryContactName !== undefined && {
            primaryContactName: meta.primaryContactName,
          }),
          ...(meta.primaryContactEmail !== undefined && {
            primaryContactEmail: meta.primaryContactEmail,
          }),
          ...(meta.primaryContactRole !== undefined && {
            primaryContactRole: meta.primaryContactRole,
          }),
          ...(meta.primaryContactPhone !== undefined && {
            primaryContactPhone: meta.primaryContactPhone,
          }),
          ...(meta.lastMeetingDate !== undefined && {
            lastMeetingDate: meta.lastMeetingDate,
          }),
          ...(meta.internalNotes !== undefined && {
            internalNotes: meta.internalNotes,
          }),
          updatedAt: now,
        })
        .where(eq(universityPartnerMeta.id, existingMeta.id));
    } else {
      await db.insert(universityPartnerMeta).values({
        authorizationId: authRow.id,
        universityOrgId: authRow.universityOrgId,
        companyOrgId: authRow.companyOrgId,
        priority: meta.priority ?? "normal",
        primaryContactName: meta.primaryContactName ?? null,
        primaryContactEmail: meta.primaryContactEmail ?? null,
        primaryContactRole: meta.primaryContactRole ?? null,
        primaryContactPhone: meta.primaryContactPhone ?? null,
        lastMeetingDate: meta.lastMeetingDate ?? null,
        internalNotes: meta.internalNotes ?? null,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/university/requests/[id]/meta error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
