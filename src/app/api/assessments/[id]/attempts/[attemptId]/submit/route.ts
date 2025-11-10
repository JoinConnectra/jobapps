import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  assessmentAttempts,
  assessmentAnswers,
  assessmentQuestions,
  applicationAssessments,
} from "@/db/schema-pg";
import { eq, inArray, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

/** RFC4122 UUID v5 from a string (deterministic) */
async function uuidV5FromString(
  name: string,
  namespace = "6ba7b811-9dad-11d1-80b4-00c04fd430c8"
) {
  const nsHex = namespace.replace(/-/g, "");
  const ns = new Uint8Array(16);
  for (let i = 0; i < 16; i++) ns[i] = parseInt(nsHex.slice(i * 2, i * 2 + 2), 16);
  const nameBytes = new TextEncoder().encode(name);
  const combined = new Uint8Array(ns.length + nameBytes.length);
  combined.set(ns, 0);
  combined.set(nameBytes, ns.length);
  // @ts-ignore
  const subtle = globalThis.crypto?.subtle ?? (require("crypto").webcrypto.subtle);
  const hashBuf = await subtle.digest("SHA-1", combined);
  const hash = new Uint8Array(hashBuf).slice(0, 16);
  hash[6] = (hash[6] & 0x0f) | 0x50; // v5
  hash[8] = (hash[8] & 0x3f) | 0x80; // variant
  const hex: string[] = [];
  for (let i = 0; i < 16; i++) hex.push((hash[i] + 0x100).toString(16).slice(1));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; attemptId: string }> }
) {
  try {
    const { id, attemptId } = await ctx.params;
    const aid = Number(id);
    const atid = Number(attemptId);
    if (!Number.isFinite(aid) || !Number.isFinite(atid)) {
      return NextResponse.json({ error: "Invalid attempt id" }, { status: 400 });
    }

    const authUser = await getCurrentUser(req);
    if (!authUser?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const candidateUuid = await uuidV5FromString(String(authUser.email));

    const attempt = await db.query.assessmentAttempts.findFirst({
      where: (a, { eq }) => eq(a.id, atid),
    });
    if (!attempt || Number((attempt as any).assessmentId) !== aid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const attemptCandidateId =
      (attempt as any).candidateId ?? (attempt as any).candidate_id ?? null;
    if (!attemptCandidateId || String(attemptCandidateId) !== String(candidateUuid)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 🚫 Already submitted? Block re-submission.
    if ((attempt as any).status === "submitted") {
      return NextResponse.json({ error: "Attempt already submitted" }, { status: 409 });
    }

    const body = await req.json().catch(() => ({}));
    const answers = body?.answers ?? {};

    // Load questions for scoring
    const qs = await db
      .select()
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.assessmentId, (attempt as any).assessmentId));

    // Idempotent final submit: wipe answers, then insert final payload
    await db.delete(assessmentAnswers).where(eq(assessmentAnswers.attemptId, atid));

    let totalPossible = 0;
    let totalScore = 0;

    for (const q of qs as any[]) {
      const qid = Number(q.id);
      const kind: "mcq" | "short" | "coding" | "case" = q.kind ?? "short";
      const userResp = (answers as Record<number, any>)?.[qid] ?? null;
      if (!userResp) continue;

      const correctAnswer = q.correctAnswer ?? q.correct_answer ?? null;

      let autoScore: number | null = null;
      if (kind === "mcq") {
        totalPossible += 1;
        if (correctAnswer != null) {
          autoScore = userResp?.choice === correctAnswer ? 1 : 0;
          totalScore += autoScore;
        } else {
          autoScore = 0;
        }
      } else {
        autoScore = null;
      }

      await db.insert(assessmentAnswers).values({
        attemptId: atid,
        questionId: qid,
        responseJson:
          userResp && typeof userResp === "object" ? userResp : { value: userResp },
        autoScore: autoScore as any,
      } as any);
    }

    const submittedAt = new Date();
    const autoScoreTotal =
      totalPossible > 0 ? Number(totalScore) / Number(totalPossible) : null;

    // ✅ 1) Mark assessment_attempts as submitted
    await db
      .update(assessmentAttempts)
      .set({
        status: "submitted",
        submittedAt,
        score: Number(totalScore) as any,
        totalPossible: Number(totalPossible) as any,
        autoScoreTotal: autoScoreTotal as any,
      } as any)
      .where(eq(assessmentAttempts.id, atid));

    // ✅ 2) Mark application_assessments as completed for THIS user & THIS assessment
    // Look up this user's DB id
    const usersRes = await db.execute(sql/* sql */`
      select id from "users" where email = ${authUser.email} limit 1
    `);
    const meId: number | null =
      usersRes.rows && usersRes.rows[0] ? Number((usersRes.rows[0] as any).id) : null;

    if (meId != null) {
      // find their application ids
      const appsRes = await db.execute(sql/* sql */`
        select id
        from "applications"
        where applicant_user_id = ${meId}
      `);

      const myAppIds: number[] = (appsRes.rows ?? [])
        .map((r: any) => Number(r.id))
        .filter((n: number) => Number.isFinite(n));

      if (myAppIds.length > 0) {
        await db
          .update(applicationAssessments)
          .set({
            status: "completed",
            submittedAt,
            score: Number(totalScore) as any,
          } as any)
          .where(
            and(
              inArray(applicationAssessments.applicationId, myAppIds),
              eq(applicationAssessments.assessmentId, aid)
            )
          );
      }
    }

    return NextResponse.json({
      ok: true,
      score: totalScore,
      totalPossible,
      autoScoreTotal,
      submittedAt: submittedAt.toISOString(),
    });
  } catch (err) {
    console.error(
      "POST /api/assessments/[id]/attempts/[attemptId]/submit error:",
      (err as any)?.message || err
    );
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
