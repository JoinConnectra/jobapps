import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { assessments, assessmentAttempts, assessmentQuestions } from "@/db/schema-pg";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

function j(status: number, payload: any) {
  return NextResponse.json(payload, { status });
}

// POST /api/assessments/:id/attempts
// Creates an attempt for the current auth user (candidate)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const assessmentId = Number(params.id);
  if (!Number.isFinite(assessmentId)) return j(400, { error: "Invalid assessment id" });

  // 1) Auth (Better-Auth)
  const authUser = await getCurrentUser(req);
  if (!authUser) return j(401, { error: "Unauthorized" });

  const candidateId = authUser.id; // string UUID

  // 2) Check assessment exists and is published
  const assess = await db.query.assessments.findFirst({
    where: (a, { eq }) => eq(a.id, assessmentId)
  });
  if (!assess) return j(404, { error: "Assessment not found" });
  if (!assess.isPublished) return j(400, { error: "Assessment is not published" });

  // 3) Optional: check if questions exist
  const qs = await db.select().from(assessmentQuestions)
    .where(eq(assessmentQuestions.assessmentId, assessmentId));

  if (qs.length === 0) {
    return j(400, { error: "Assessment has no questions" });
  }

  // 4) Create attempt
  const [attempt] = await db.insert(assessmentAttempts).values({
    assessmentId,
    candidateId,
    status: "in_progress"
  }).returning();

  return j(201, {
    ok: true,
    attemptId: attempt.id
  });
}
