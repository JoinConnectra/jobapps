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

/** Resolve the org id column name across schema variants */
function resolveOrgCol() {
  const aAny = assessments as any;
  return aAny.orgId ?? aAny.organizationId ?? aAny.org_id;
}

/** RFC4122 UUID v5 (deterministic from name+namespace) */
async function uuidFromStringV5Async(
  name: string,
  namespace = "6ba7b811-9dad-11d1-80b4-00c04fd430c8"
) {
  const nsBytes = (() => {
    const hex = namespace.replace(/-/g, "");
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    return bytes;
  })();
  const nameBytes = new TextEncoder().encode(name);

  const toHash = new Uint8Array(nsBytes.length + nameBytes.length);
  toHash.set(nsBytes, 0);
  toHash.set(nameBytes, nsBytes.length);

  // @ts-ignore
  const subtle = globalThis.crypto?.subtle ?? (require("crypto").webcrypto.subtle);
  const hashBuf = await subtle.digest("SHA-1", toHash);
  const hash = new Uint8Array(hashBuf).slice(0, 16);

  // version 5 + RFC 4122 variant
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
    // 0) Who is the student?
    const authUser = await getCurrentUser(req);
    if (!authUser) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Resolve DB user (same pattern as other student APIs)
    const { rows: userRows } = await db.execute(sql/* sql */`
      select id, email
      from "users"
      where email = ${authUser.email}
      limit 1
    `);
    const me = userRows?.[0];
    if (!me) {
      return NextResponse.json({ ok: false, error: "No DB user for email" }, { status: 401 });
    }
    const meId: number = Number(me.id);

    // 1) application_assessments for MY applications
    const aa = await db
      .select({
        aaId: applicationAssessments.id,
        applicationId: applicationAssessments.applicationId,
        assessmentId: applicationAssessments.assessmentId,
        status: applicationAssessments.status,
        startedAt: applicationAssessments.startedAt,
        submittedAt: applicationAssessments.submittedAt,
        score: applicationAssessments.score,
      })
      .from(applicationAssessments)
      .innerJoin(applications, eq(applicationAssessments.applicationId, applications.id))
      .where(eq(applications.applicantUserId, meId));

    if (aa.length === 0) return NextResponse.json([], { status: 200 });

    // 2) Hydrate assessments + orgs
    const assessmentIds = [...new Set(aa.map((r) => r.assessmentId))];
    const orgCol: any = resolveOrgCol();

    const assn = await db
      .select({
        id: assessments.id,
        title: assessments.title,
        orgId: orgCol,
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

    // 3) Latest attempt per assessment for THIS student.
    //    Your table has candidate_id (UUID). We derive a deterministic UUID from email
    //    (same method used by the Start Attempt API) so "Continue" aligns.
    const candidateUuid = await uuidFromStringV5Async(String(authUser.email));

    // Build a typed int array for ANY()
    const typedArr = sql`${sql.raw(`array[${assessmentIds.map(Number).join(",")}]::int4[]`)}`;

    const attempts = await db.execute(sql/* sql */`
      with mine as (
        select id, assessment_id
        from assessment_attempts
        where candidate_id = ${candidateUuid}::uuid
          and assessment_id = any(${typedArr})
      ),
      ranked as (
        select *,
               row_number() over (partition by assessment_id order by id desc) as rn
        from mine
      )
      select id, assessment_id
      from ranked
      where rn = 1
    `);

    const latestAttemptByAssessment = new Map<number, number>();
    for (const row of attempts.rows ?? []) {
      latestAttemptByAssessment.set(Number(row.assessment_id), Number(row.id));
    }

    // 4) Normalize + shape output
    const list = aa.map((r) => {
      const a = assessById.get(r.assessmentId);
      const org = a?.orgId ? orgById.get(Number(a.orgId)) : undefined;

      const normalizedStatus =
        r.status === "in_progress"
          ? "in_progress"
          : r.status === "completed"
          ? "completed"
          : "assigned";

      return {
        id: r.assessmentId,
        title: a?.title ?? `Assessment #${r.assessmentId}`,
        orgName: org?.name ?? null,
        status: normalizedStatus as "assigned" | "in_progress" | "completed",
        attemptId: latestAttemptByAssessment.get(r.assessmentId) ?? null,
      };
    });

    return NextResponse.json(list, { status: 200 });
  } catch (e: any) {
    console.error("GET /api/student/assessments error:", e?.message || e);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
