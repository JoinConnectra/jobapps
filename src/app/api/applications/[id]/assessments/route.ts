// /src/app/api/applications/[id]/assessments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { and, desc, eq } from "drizzle-orm";
import {
  applications,
  jobs,
  memberships,
  assessments as assessmentsTable,
  applicationAssessments,
  users,
} from "@/db/schema-pg";
import { getCurrentUser } from "@/lib/auth";

function jerr(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}
const badRequest   = (m: string, c = "BAD_REQUEST")     => jerr(400, c, m);
const unauthorized = (m = "Unauthorized", c = "UNAUTHORIZED") => jerr(401, c, m);
const forbidden    = (m = "Forbidden", c = "FORBIDDEN")       => jerr(403, c, m);
const notFound     = (m = "Not Found", c = "NOT_FOUND")       => jerr(404, c, m);
const serverError  = (m = "Internal Server Error", c="SERVER_ERROR") => jerr(500, c, m);

// Resolve numeric app user id from auth user email (avoids string vs integer mismatch)
async function resolveAppUserId(req: NextRequest): Promise<number | null> {
  const authUser = await getCurrentUser(req);
  if (!authUser) return null;
  const appUser = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, authUser.email),
    columns: { id: true },
  });
  return appUser?.id ?? null;
}

// ---------- GET: list assignments for application ----------
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // auth
    // NOTE: membership enforced in POST; for GET we will ensure the requester belongs to the job's org
    // but we still need appUserId for the membership check.
  } catch {}
  try {
    const req = _req;
    const appUserId = await resolveAppUserId(req);
    if (!appUserId) return unauthorized();

    const appId = Number(params.id);
    if (!Number.isFinite(appId) || appId <= 0) return badRequest("Invalid application id");

    // Load application & job to discover the org
    const appRow = await db.query.applications.findFirst({
      where: (a, { eq }) => eq(a.id, appId),
      columns: { id: true, jobId: true },
    });
    if (!appRow) return notFound("Application not found");

    const jobRow = await db.query.jobs.findFirst({
      where: (j, { eq }) => eq(j.id, appRow.jobId),
      columns: { id: true, orgId: true },
    });
    if (!jobRow) return notFound("Job not found");

    // Membership check
    const member = await db.query.memberships.findFirst({
      where: (m, { and, eq }) => and(eq(m.orgId, jobRow.orgId), eq(m.userId, appUserId)),
      columns: { id: true },
    });
    if (!member) return forbidden("Not a member of this organization");

    // List assignments
    const rows = await db
      .select({
        id: applicationAssessments.id,
        status: applicationAssessments.status,
        dueAt: applicationAssessments.dueAt,
        invitedAt: applicationAssessments.invitedAt,
        startedAt: applicationAssessments.startedAt,
        submittedAt: applicationAssessments.submittedAt,
        score: applicationAssessments.score,
        resultJson: applicationAssessments.resultJson,
        createdAt: applicationAssessments.createdAt,
        assessmentId: applicationAssessments.assessmentId,
        // join a few assessment fields
        assessmentTitle: assessmentsTable.title,
        assessmentType: assessmentsTable.type,
        assessmentDuration: assessmentsTable.duration,
      })
      .from(applicationAssessments)
      .innerJoin(
        assessmentsTable,
        eq(applicationAssessments.assessmentId, assessmentsTable.id)
      )
      .where(eq(applicationAssessments.applicationId, appId))
      .orderBy(desc(applicationAssessments.createdAt));

    return NextResponse.json(rows);
  } catch (err) {
    console.error("[GET /api/applications/[id]/assessments] error:", err);
    return serverError();
  }
}

// ---------- POST: assign an assessment to an application ----------
/**
 * Body:
 * {
 *   assessmentId: number,
 *   dueAt?: string (ISO)
 * }
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const req = _req;
    const appUserId = await resolveAppUserId(req);
    if (!appUserId) return unauthorized();

    const appId = Number(params.id);
    if (!Number.isFinite(appId) || appId <= 0) return badRequest("Invalid application id");

    const body = await req.json().catch(() => null);
    if (!body) return badRequest("Invalid JSON body");

    const { assessmentId, dueAt } = body as {
      assessmentId?: number;
      dueAt?: string;
    };

    if (!assessmentId) return badRequest("assessmentId is required");

    // Load application & job to discover the org
    const appRow = await db.query.applications.findFirst({
      where: (a, { eq }) => eq(a.id, appId),
      columns: { id: true, jobId: true },
    });
    if (!appRow) return notFound("Application not found");

    const jobRow = await db.query.jobs.findFirst({
      where: (j, { eq }) => eq(j.id, appRow.jobId),
      columns: { id: true, orgId: true },
    });
    if (!jobRow) return notFound("Job not found");

    // Membership check
    const member = await db.query.memberships.findFirst({
      where: (m, { and, eq }) => and(eq(m.orgId, jobRow.orgId), eq(m.userId, appUserId)),
      columns: { id: true },
    });
    if (!member) return forbidden("Not a member of this organization");

    // Ensure assessment belongs to the same org
    const assess = await db.query.assessments.findFirst({
      where: (a, { and, eq }) => and(eq(a.id, assessmentId), eq(a.orgId, jobRow.orgId)),
      columns: { id: true },
    });
    if (!assess) return forbidden("Assessment not found for this organization");

    // Create assignment
    const [created] = await db
      .insert(applicationAssessments)
      .values({
        applicationId: appId,
        assessmentId,
        status: "assigned",
        dueAt: dueAt ? new Date(dueAt) : null,
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("[POST /api/applications/[id]/assessments] error:", err);
    return serverError();
  }
}
