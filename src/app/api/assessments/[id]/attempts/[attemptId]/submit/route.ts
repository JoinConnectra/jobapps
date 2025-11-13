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
import { gradeCode } from "@/lib/grader";

export const runtime = "nodejs";

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
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
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

/* ------------------------------ helpers ------------------------------ */

/** safe JSON.parse */
function tryParseJSON<T = any>(s: string | undefined | null): T | undefined {
  if (!s || typeof s !== "string") return;
  try { return JSON.parse(s) as T; } catch { return; }
}

/** best-effort to coerce options_json to an object */
function parseOptionsJson(raw: any): any {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") return tryParseJSON(raw) ?? {};
  return {};
}

/** normalize tests to always use { args?, input?, output } */
function normalizeTests(tests: any[]): { args?: any[]; input?: string; output: any }[] {
  if (!Array.isArray(tests)) return [];
  return tests.map((t: any) => {
    if (t && typeof t === "object") {
      const output = Object.prototype.hasOwnProperty.call(t, "output") ? t.output : t.expect;
      const args = Array.isArray(t.args) ? t.args : undefined;
      const input = typeof t.input === "string" ? t.input : undefined;
      return { args, input, output };
    }
    return t;
  });
}

/** deep search for a string field named "code" anywhere */
function deepFindCode(obj: any, depth = 0): string | undefined {
  if (depth > 5 || !obj) return;
  if (typeof obj === "string") {
    const trimmed = obj.trim();
    if (trimmed.startsWith("{") && trimmed.includes('"code"')) {
      const parsed = tryParseJSON<{ code?: string }>(trimmed);
      if (parsed?.code && typeof parsed.code === "string") return parsed.code;
    }
    // looks like raw JS
    return obj;
  }
  if (typeof obj === "object") {
    if (typeof obj.code === "string") return obj.code;
    if (typeof obj.value === "string" || typeof obj.value === "object") {
      const fromVal = deepFindCode(obj.value, depth + 1);
      if (fromVal) return fromVal;
    }
    for (const k of Object.keys(obj)) {
      const v = (obj as any)[k];
      const found = deepFindCode(v, depth + 1);
      if (found) return found;
    }
  }
  return;
}

/** Extract student code robustly from many shapes */
function extractUserCode(userResp: any): string {
  const found = deepFindCode(userResp);
  if (typeof found === "string") {
    // Final safety: if it STILL looks like JSON, peel code out
    const maybeJson = found.trim();
    if (maybeJson.startsWith("{") && maybeJson.includes('"code"')) {
      const parsed = tryParseJSON<{ code?: string }>(maybeJson);
      if (parsed?.code && typeof parsed.code === "string") return parsed.code;
    }
    return found;
  }
  return "";
}

/* -------------------------------------------------------------------- */

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

    if ((attempt as any).status === "submitted") {
      return NextResponse.json({ error: "Attempt already submitted" }, { status: 409 });
    }

    const body = await req.json().catch(() => ({} as any));
    const answers = body?.answers ?? {};

    const qs = await db
      .select()
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.assessmentId, (attempt as any).assessmentId));

    await db.delete(assessmentAnswers).where(eq(assessmentAnswers.attemptId, atid));

    let totalPossible = 0;
    let totalScore = 0;

    for (const q of qs as any[]) {
      const qid = Number(q.id);
      const kind: "mcq" | "short" | "coding" | "case" = q.kind ?? "short";
      const userResp = (answers as Record<any, any>)?.[qid] ?? (answers as Record<any, any>)?.[String(qid)] ?? null;
      if (userResp == null) continue;

      let autoScore: number | null = null;

      if (kind === "mcq") {
        const opts = parseOptionsJson(q.optionsJson ?? q.options_json ?? {});
        const points = Number(opts?.points ?? 1);
        totalPossible += points;

        const correctAnswer = q.correctAnswer ?? q.correct_answer ?? null;
        if (correctAnswer != null) {
          autoScore = userResp?.choice === correctAnswer ? points : 0;
          totalScore += Number(autoScore);
        } else {
          autoScore = 0;
        }
      } else if (kind === "coding") {
        const opts = parseOptionsJson(q.optionsJson ?? q.options_json ?? {});
        const points = Number(opts?.points ?? 1);
        totalPossible += points;

        const language = String((opts?.language ?? "javascript")).toLowerCase() as
          | "javascript"
          | "python"
          | "cpp";
        const entryPoint = String(opts?.entryPoint || "solution");
        const tests = normalizeTests(Array.isArray(opts?.tests) ? opts.tests : []);

        // 🔒 Extract (and de-JSON) the code
        let code: string = extractUserCode(userResp);

        // 🔁 Hail-mary: sometimes UI sends { code: "..." } but also double-stringified
        if (code.trim().startsWith("{") && code.includes('"code"')) {
          const parsed = tryParseJSON<{ code?: string }>(code.trim());
          if (parsed?.code) code = parsed.code;
        }

        if (code.trim().length === 0 || tests.length === 0) {
          autoScore = 0;
        } else {
          try {
            const res = await gradeCode({
              language,
              code,
              tests,
              options: { entryPoint, points },
            });
            autoScore = Number(res.earned ?? 0);
            totalScore += Number(autoScore);
          } catch (e: any) {
            // If the code was still JSON by mistake, never crash — just zero it and keep going.
            console.error("[grader] code exec error, first 80 chars:", String(code).slice(0, 80));
            console.error("[grader] error:", e?.message || e);
            autoScore = 0;
          }
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

    const usersRes = await db.execute(sql/* sql */`
      select id from "users" where email = ${authUser.email} limit 1
    `);
    const meId: number | null =
      usersRes.rows && usersRes.rows[0] ? Number((usersRes.rows[0] as any).id) : null;

    if (meId != null) {
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
