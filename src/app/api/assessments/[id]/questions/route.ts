import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { assessmentQuestions, assessments, memberships, users } from "@/db/schema-pg";
import { eq, and, asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

function j(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

// Resolve numeric app user from email
async function resolveAppUserId(req: NextRequest) {
  const authUser = await getCurrentUser(req);
  if (!authUser) return null;
  const u = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, authUser.email),
    columns: { id: true }
  });
  return u?.id ?? null;
}

// Membership check
async function requireMember(appUserId: number, orgId: number) {
  const mem = await db.query.memberships.findFirst({
    where: (m, { eq, and }) => and(eq(m.orgId, orgId), eq(m.userId, appUserId)),
    columns: { id: true }
  });
  return !!mem;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const assessmentId = Number(params.id);
  if (!Number.isFinite(assessmentId)) return j(400, { error: "Invalid id" });

  const appUserId = await resolveAppUserId(req);
  if (!appUserId) return j(401, { error: "Unauthorized" });

  const assess = await db.query.assessments.findFirst({ where: (a, { eq }) => eq(a.id, assessmentId) });
  if (!assess) return j(404, { error: "Assessment not found" });

  const ok = await requireMember(appUserId, assess.orgId);
  if (!ok) return j(403, { error: "Forbidden" });

  const qs = await db.select().from(assessmentQuestions)
    .where(eq(assessmentQuestions.assessmentId, assessmentId))
    .orderBy(asc(assessmentQuestions.orderIndex));

  return j(200, qs);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const assessmentId = Number(params.id);
  if (!Number.isFinite(assessmentId)) return j(400, { error: "Invalid id" });

  const appUserId = await resolveAppUserId(req);
  if (!appUserId) return j(401, { error: "Unauthorized" });

  const assess = await db.query.assessments.findFirst({ where: (a, { eq }) => eq(a.id, assessmentId) });
  if (!assess) return j(404, { error: "Assessment not found" });

  const ok = await requireMember(appUserId, assess.orgId);
  if (!ok) return j(403, { error: "Forbidden" });

  const body = await req.json().catch(() => null);
  if (!body) return j(400, { error: "Invalid JSON" });

  const { prompt, kind, optionsJson, correctAnswer, orderIndex } = body;

  if (!prompt || !prompt.trim()) return j(400, { error: "prompt is required" });

  const [created] = await db.insert(assessmentQuestions).values({
    assessmentId,
    prompt: prompt.trim(),
    kind: kind ?? "text",
    optionsJson: optionsJson ?? null,
    correctAnswer: correctAnswer ?? null,
    orderIndex: orderIndex ?? null,
  }).returning();

  return j(201, created);
}
