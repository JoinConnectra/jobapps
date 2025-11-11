// src/app/api/assessments/[id]/attempts/[attemptId]/review/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { assessmentAnswers, assessmentQuestions } from "@/db/schema-pg";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; attemptId: string }> }
) {
  const { id, attemptId } = await ctx.params; // ✅ await params in App Router
  const assessmentId = Number(id);
  const atId = Number(attemptId);
  if (!Number.isFinite(assessmentId) || !Number.isFinite(atId)) {
    return NextResponse.json({ error: "Bad params" }, { status: 400 });
  }

  const authUser = await getCurrentUser(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const appUser = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, authUser.email),
    columns: { id: true }
  });
  if (!appUser?.id) return NextResponse.json({ error: "No app user" }, { status: 403 });

  const assess = await db.query.assessments.findFirst({
    where: (a, { eq }) => eq(a.id, assessmentId)
  });
  if (!assess) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });

  const member = await db.query.memberships.findFirst({
    where: (m, { and, eq }) => and(eq(m.orgId, (assess as any).orgId), eq(m.userId, appUser.id)),
    columns: { id: true }
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const attempt = await db.query.assessmentAttempts.findFirst({
    where: (a, { eq }) => eq(a.id, atId),
    columns: { assessmentId: true }
  });
  if (!attempt || (attempt as any).assessmentId !== assessmentId) {
    return NextResponse.json({ error: "Attempt not found for assessment" }, { status: 404 });
  }

  const rows = await db
    .select({
      question: assessmentQuestions.prompt,
      kind: assessmentQuestions.kind,
      correctAnswer: assessmentQuestions.correctAnswer,
      response: assessmentAnswers.responseJson,
      autoScore: assessmentAnswers.autoScore,
    })
    .from(assessmentAnswers)
    .leftJoin(assessmentQuestions, eq(assessmentAnswers.questionId, assessmentQuestions.id))
    .where(eq(assessmentAnswers.attemptId, atId));

  return NextResponse.json(rows);
}
