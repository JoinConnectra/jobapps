// src/app/api/student/assessments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sql, eq, inArray } from "drizzle-orm";
import {
  applications,
  applicationAssessments,
  assessments,
  organizations,
} from "@/db/schema-pg";
import { getCurrentUser } from "@/lib/auth";

function parseDurationToSeconds(s?: string | null): number | null {
  if (!s) return null;
  const str = String(s).toLowerCase();
  const hourMatch = str.match(/(\d+)\s*(hour|hours|hr|hrs)/i);
  const minMatch = str.match(/(\d+)\s*(min|mins|minute|minutes)/i);
  let seconds = 0;
  if (hourMatch) seconds += Number(hourMatch[1]) * 3600;
  if (minMatch) seconds += Number(minMatch[1]) * 60;
  if (!hourMatch && !minMatch) {
    const num = Number(str.match(/(\d+)/)?.[1]);
    if (Number.isFinite(num)) seconds += num * 60;
  }
  return seconds || null;
}

function resolveOrgCol() {
  const aAny = assessments as any;
  return aAny.orgId ?? aAny.organizationId ?? aAny.org_id;
}

/** RFC 4122 UUID v5 (deterministic) */
async function uuidFromStringV5Async(
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

export async function GET(req: NextRequest) {
  try {
    const authUser = await getCurrentUser(req);
    if (!authUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Resolve DB user
    const usersRes = await db.execute(sql/* sql */`
      select id, email
      from "users"
      where email = ${authUser.email}
      limit 1
    `);
    const me = usersRes.rows?.[0] as { id: number } | undefined;
    if (!me) {
      return NextResponse.json({ ok: false, error: "No DB user for email" }, { status: 401 });
    }
    const meId = Number(me.id);

    // application_assessments for MY applications
    const aa = await db
      .select({
        aaId: applicationAssessments.id,
        applicationId: applicationAssessments.applicationId,
        assessmentId: applicationAssessments.assessmentId,
        status: applicationAssessments.status,
        startedAt: applicationAssessments.startedAt,
        submittedAt: applicationAssessments.submittedAt,
        dueAt: applicationAssessments.dueAt,
        score: applicationAssessments.score,
      })
      .from(applicationAssessments)
      .innerJoin(applications, eq(applicationAssessments.applicationId, applications.id))
      .where(eq(applications.applicantUserId, meId));

    if (aa.length === 0) return NextResponse.json([], { status: 200 });

    // Hydrate assessments + orgs
    const assessmentIds = [...new Set(aa.map((r) => r.assessmentId))];
    const orgCol: any = resolveOrgCol();

    const assn = await db
      .select({
        id: assessments.id,
        title: assessments.title,
        orgId: orgCol,
        duration: assessments.duration, // e.g. "30 min"
      })
      .from(assessments)
      .where(inArray(assessments.id, assessmentIds));

    const orgIds = [...new Set(assn.map((a) => a.orgId).filter(Boolean))] as number[];
    let orgById = new Map<number, { id: number; name: string }>();
    if (orgIds.length > 0) {
      const orgRows = await db
        .select({ id: organizations.id, name: organizations.name })
        .from(organizations)
        .where(inArray(organizations.id, orgIds));
      orgById = new Map(orgRows.map((o) => [o.id, o]));
    }
    const assessById = new Map(assn.map((a) => [a.id, a]));

    // Latest attempt per assessment (for THIS student), with status
    const candidateUuid = await uuidFromStringV5Async(String(authUser.email));
    const typedArr = sql`${sql.raw(`array[${assessmentIds.map(Number).join(",")}]::int4[]`)}`;

    const attemptsRes = await db.execute(sql/* sql */`
      with mine as (
        select id, assessment_id, status, submitted_at
        from assessment_attempts
        where candidate_id = ${candidateUuid}::uuid
          and assessment_id = any(${typedArr})
      ),
      ranked as (
        select *,
               row_number() over (partition by assessment_id order by id desc) as rn
        from mine
      )
      select id, assessment_id, status, submitted_at
      from ranked
      where rn = 1
    `);

    type AttemptPick = { id: number; status: string | null; submitted_at: string | null };
    const latestAttemptByAssessment = new Map<number, AttemptPick>();
    for (const row of attemptsRes.rows ?? []) {
      const r: any = row;
      latestAttemptByAssessment.set(Number(r.assessment_id), {
        id: Number(r.id),
        status: (r.status ?? null) as string | null,
        submitted_at: (r.submitted_at ?? null) as string | null,
      });
    }

    // Normalize + shape output (override to completed if attempt is submitted)
    const list = aa.map((r) => {
      const a = assessById.get(r.assessmentId);
      const org = a?.orgId ? orgById.get(Number(a.orgId)) : undefined;

      let normalizedStatus: "assigned" | "in_progress" | "completed" =
        r.status === "in_progress"
          ? "in_progress"
          : r.status === "completed"
          ? "completed"
          : "assigned";

      const attemptPick = latestAttemptByAssessment.get(r.assessmentId);
      if (attemptPick?.status === "submitted") {
        normalizedStatus = "completed";
      }

      return {
        id: r.assessmentId,
        title: a?.title ?? `Assessment #${r.assessmentId}`,
        orgName: org?.name ?? null,
        status: normalizedStatus,
        attemptId: attemptPick?.id ?? null,
        dueAt: r.dueAt ? String(r.dueAt) : null,
        durationSec: parseDurationToSeconds(a?.duration ?? null),
      };
    });

    return NextResponse.json(list, { status: 200 });
  } catch (e: any) {
    console.error("GET /api/student/assessments error:", e?.message || e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
