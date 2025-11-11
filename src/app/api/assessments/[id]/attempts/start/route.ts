import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { assessmentAttempts } from "@/db/schema-pg";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

/** UUID v5 helper */
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
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await ctx.params;
    const aid = Number(id);
    if (!Number.isFinite(aid)) {
      return NextResponse.json({ error: "Invalid assessment id" }, { status: 400 });
    }

    const authUser = await getCurrentUser(req);
    if (!authUser?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const candidateUuid = await uuidV5FromString(String(authUser.email));

    // Reuse any in-progress attempt for this candidate+assessment
    const existing = await db.query.assessmentAttempts.findFirst({
      where: (t, { eq, and }) => and(eq(t.assessmentId, aid), eq(t.candidateId, candidateUuid)),
      orderBy: (t, { desc }) => [desc(t.startedAt)],
    });

    if (existing && (existing as any).status !== "submitted") {
      return NextResponse.json({ ok: true, attemptId: (existing as any).id, status: (existing as any).status });
    }

    // Create fresh attempt
    const inserted = await db
      .insert(assessmentAttempts)
      .values({
        assessmentId: aid,
        candidateId: candidateUuid as any,
        status: "in_progress" as any,
        startedAt: new Date() as any,
      } as any)
      .returning({ id: assessmentAttempts.id });

    const newId = inserted?.[0]?.id;
    return NextResponse.json({ ok: true, attemptId: newId, status: "in_progress" });
  } catch (e) {
    console.error("POST /api/assessments/[id]/attempts/start error:", (e as any)?.message || e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
