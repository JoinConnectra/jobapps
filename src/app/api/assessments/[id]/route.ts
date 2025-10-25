import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { assessments, memberships } from "@/db/schema-pg";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

const j = (s:number, payload:any) => NextResponse.json(payload, { status: s });
const err = (s:number, code:string, message:string) => j(s, { error: { code, message } });

async function requireMember(req: NextRequest, orgId: number) {
  const user = await getCurrentUser(req);
  if (!user) return err(401, "UNAUTHORIZED", "Sign in required");
  const m = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, user.email), columns: { id: true }});
  if (!m?.id) return err(403, "FORBIDDEN", "No app user");
  const member = await db.query.memberships.findFirst({
    where: (mm, { and, eq }) => and(eq(mm.orgId, orgId), eq(mm.userId, m.id)),
    columns: { id: true },
  });
  if (!member) return err(403, "FORBIDDEN", "Not in org");
  return null; // ok
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return err(400, "BAD_REQUEST", "Invalid id");

  const row = await db.query.assessments.findFirst({ where: (a, { eq }) => eq(a.id, id) });
  if (!row) return err(404, "NOT_FOUND", "Assessment not found");

  const authErr = await requireMember(req, row.orgId);
  if (authErr) return authErr;

  return j(200, row);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return err(400, "BAD_REQUEST", "Invalid id");

  const existing = await db.query.assessments.findFirst({ where: (a, { eq }) => eq(a.id, id) });
  if (!existing) return err(404, "NOT_FOUND", "Assessment not found");

  const authErr = await requireMember(req, existing.orgId);
  if (authErr) return authErr;

  const body = await req.json().catch(() => null);
  if (!body) return err(400, "BAD_REQUEST", "Invalid JSON");

  const { title, type, duration, descriptionMd, status, isPublished } = body;
  const [updated] = await db
    .update(assessments)
    .set({
      title: title ?? existing.title,
      type: type ?? existing.type,
      duration: duration ?? existing.duration,
      descriptionMd: descriptionMd ?? existing.descriptionMd,
      status: status ?? existing.status,
      isPublished: typeof isPublished === "boolean" ? isPublished : existing.isPublished,
      updatedAt: new Date(),
    })
    .where(eq(assessments.id, id))
    .returning();

  return j(200, updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return err(400, "BAD_REQUEST", "Invalid id");

  const existing = await db.query.assessments.findFirst({ where: (a, { eq }) => eq(a.id, id) });
  if (!existing) return err(404, "NOT_FOUND", "Assessment not found");

  const authErr = await requireMember(req, existing.orgId);
  if (authErr) return authErr;

  await db.delete(assessments).where(eq(assessments.id, id));
  return j(200, { ok: true });
}
