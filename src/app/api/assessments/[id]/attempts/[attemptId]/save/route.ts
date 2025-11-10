import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { assessmentAttempts, assessmentAnswers } from "@/db/schema-pg";
import { and, eq, inArray } from "drizzle-orm";
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

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; attemptId: string }> }
) {
  try {
    const { id, attemptId } = await ctx.params;
    const aid = Number(id);
    const atid = Number(attemptId);
    if (!Number.isFinite(aid) || !Number.isFinite(atid)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const authUser = await getCurrentUser(req);
    if (!authUser?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const candidateUuid = await uuidV5FromString(String(authUser.email));

    const attempt = await db.query.assessmentAttempts.findFirst({
      where: (a, { eq }) => eq(a.id, atid),
    });
    if (!attempt || Number(attempt.assessmentId) !== aid) {
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

    const body = await req.json().catch(() => ({}));
    const partial = body?.answers ?? {};
    const qids = Object.keys(partial)
      .map((k) => Number(k))
      .filter((n) => Number.isFinite(n));

    if (qids.length === 0) {
      return NextResponse.json({ ok: true, saved: 0 });
    }

    // ✅ Use and(...) helper instead of chaining .and(...)
    await db
      .delete(assessmentAnswers)
      .where(
        and(
          inArray(assessmentAnswers.questionId as any, qids as any),
          eq(assessmentAnswers.attemptId, atid)
        )
      );

    const rows = qids.map((qid) => ({
      attemptId: atid,
      questionId: qid,
      responseJson:
        partial[qid] && typeof partial[qid] === "object"
          ? partial[qid]
          : { value: partial[qid] },
      autoScore: null as any, // drafts aren’t auto-scored; submit route will compute
    }));

    if (rows.length > 0) {
      await db.insert(assessmentAnswers).values(rows as any);
    }

    return NextResponse.json({ ok: true, saved: rows.length });
  } catch (err) {
    console.error(
      "POST /api/assessments/[id]/attempts/[attemptId]/save error:",
      (err as any)?.message || err
    );
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
