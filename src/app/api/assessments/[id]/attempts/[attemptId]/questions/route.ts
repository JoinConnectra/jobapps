import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql, eq, asc } from "drizzle-orm";
import {
  assessmentAttempts,
  assessmentQuestions,
  assessments,
} from "@/db/schema-pg";
import { getCurrentUser } from "@/lib/auth";

/** RFC4122 UUID v5 from a string (deterministic). */
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

/** Parse "30 min", "1 hour", "90 minutes" → seconds. */
function parseDurationToSeconds(s?: string | null): number | null {
  if (!s) return null;
  const str = String(s).toLowerCase();
  const h = str.match(/(\d+)\s*(hour|hours|hr|hrs)/i);
  const m = str.match(/(\d+)\s*(min|mins|minute|minutes)/i);
  let sec = 0;
  if (h) sec += Number(h[1]) * 3600;
  if (m) sec += Number(m[1]) * 60;
  if (!h && !m) {
    const num = Number(str.match(/(\d+)/)?.[1]);
    if (Number.isFinite(num)) sec += num * 60;
  }
  return sec || null;
}

export async function GET(
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
    if (!authUser?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const candidateUuid = await uuidV5FromString(String(authUser.email));

    const attempt = await db.query.assessmentAttempts.findFirst({
      where: (a, { eq }) => eq(a.id, atid),
    });

    // must exist and belong to this user, and match assessment id
    if (!attempt || Number((attempt as any).assessmentId) !== aid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const attemptCandidateId =
      (attempt as any).candidateId ?? (attempt as any).candidate_id ?? null;
    if (!attemptCandidateId || String(attemptCandidateId) !== String(candidateUuid)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 🚫 hard lock: if already submitted, do not serve questions
    if ((attempt as any).status === "submitted") {
      return NextResponse.json({ error: "Attempt already submitted" }, { status: 403 });
    }

    // Load questions in deterministic order
    const qRows = await db
      .select()
      .from(assessmentQuestions)
      .where(eq(assessmentQuestions.assessmentId, aid))
      .orderBy(asc(assessmentQuestions.orderIndex));

    // Meta (title + duration)
    const { rows: metaRows } = await db.execute(sql/* sql */`
      select "title", "duration"
      from "assessments"
      where "id" = ${aid}
      limit 1
    `);
    const meta = metaRows?.[0] ?? {};
    const title: string = (meta as any)?.title ?? "Assessment";
    const durationSec: number | null = parseDurationToSeconds((meta as any)?.duration ?? null);

    // startedAt for timer
    const rawStarted =
      (attempt as any).startedAt ??
      (attempt as any).started_at ??
      null;
    const startedAt = rawStarted ? new Date(rawStarted).toISOString() : null;

    // Normalize options JSON
    const questions = qRows.map((q: any) => {
      let optionsJson = q.optionsJson ?? q.options_json ?? null;
      if (optionsJson && typeof optionsJson === "string") {
        try { optionsJson = JSON.parse(optionsJson); } catch {}
      }
      return {
        id: Number(q.id),
        prompt: q.prompt,
        kind: (q.kind || "short") as "mcq" | "short" | "coding" | "case",
        optionsJson,
        correctAnswer: q.correctAnswer ?? q.correct_answer ?? null,
        orderIndex:
          q.orderIndex != null
            ? Number(q.orderIndex)
            : q.order_index != null
            ? Number(q.order_index)
            : null,
      };
    });

    return NextResponse.json(
      {
        questions,
        meta: {
          title,
          durationSec,
          startedAt,
          attemptStatus: (attempt as any).status ?? "in_progress",
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(
      'GET /api/assessments/[id]/attempts/[attemptId]/questions error:',
      (err as any)?.message || err
    );
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
