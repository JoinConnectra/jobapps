// src/app/api/assessments/[id]/attempts/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  assessmentAttempts,
  applicationAssessments,
  applications,
} from "@/db/schema-pg";
import { eq, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import crypto from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** UUIDv5 (DNS) to mirror student attempt creation */
function uuidFromStringV5(
  name: string,
  namespace = "6ba7b811-9dad-11d1-80b4-00c04fd430c8"
): string {
  const hexToBytes = (hex: string) => {
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    return bytes;
  };
  const uuidToBytes = (uuid: string) => hexToBytes(uuid.replace(/-/g, ""));

  const nsBytes = Buffer.from(uuidToBytes(namespace));
  const nameBytes = Buffer.from(name, "utf8");
  const hash = crypto.createHash("sha1").update(nsBytes).update(nameBytes).digest();

  const bytes = Buffer.from(hash.slice(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant

  const b = [...bytes];
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  const hex = b.map(toHex).join("");
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20),
  ].join("-");
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> } // <-- params is a Promise
) {
  const { id } = await ctx.params;            // <-- await it
  const assessmentId = Number(id);
  if (!Number.isFinite(assessmentId)) {
    return NextResponse.json({ error: "Invalid assessment id" }, { status: 400 });
  }

  const authUser = await getCurrentUser(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 1) Attempts for this assessment
  const attempts = await db
    .select({
      id: assessmentAttempts.id,
      candidateId: assessmentAttempts.candidateId,
      status: assessmentAttempts.status,
      submittedAt: assessmentAttempts.submittedAt,
      autoScoreTotal: assessmentAttempts.autoScoreTotal,
    })
    .from(assessmentAttempts)
    .where(eq(assessmentAttempts.assessmentId, assessmentId));

  // 2) All application IDs assigned to this assessment
  const aa = await db
    .select({
      applicationId: applicationAssessments.applicationId,
    })
    .from(applicationAssessments)
    .where(eq(applicationAssessments.assessmentId, assessmentId));

  const appIds = Array.from(new Set(aa.map((x) => x.applicationId)));
  let apps: { id: number; applicantName: string | null; applicantEmail: string }[] = [];

  if (appIds.length) {
    apps = await db
      .select({
        id: applications.id,
        applicantName: applications.applicantName,
        applicantEmail: applications.applicantEmail,
      })
      .from(applications)
      .where(inArray(applications.id, appIds)); // <-- real filter
  }

  // 3) Map candidate UUID <- applicantEmail (UUIDv5)
  const candidateMap = new Map<string, { name: string | null; email: string }>();
  for (const a of apps) {
    if (!a.applicantEmail) continue;
    const candUuid = uuidFromStringV5(a.applicantEmail);
    candidateMap.set(candUuid, { name: a.applicantName, email: a.applicantEmail });
  }

  // 4) Enrich rows
  const rows = attempts.map((t) => {
    const info = candidateMap.get(t.candidateId) || null;
    return {
      id: t.id,
      candidateId: t.candidateId,
      candidateName: info?.name ?? null,
      candidateEmail: info?.email ?? null,
      status: t.status,
      submittedAt: t.submittedAt,
      autoScoreTotal: t.autoScoreTotal,
    };
  });

  return NextResponse.json(rows);
}
