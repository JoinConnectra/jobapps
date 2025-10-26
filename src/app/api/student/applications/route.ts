import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { applications, jobs, organizations, users } from "@/db/schema-pg";
import { getCurrentUser } from "@/lib/auth";

/** Resolve current DB user and ensure they are an applicant */
async function getDbUserOrError(req: NextRequest) {
  const authUser = await getCurrentUser(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [dbUser] = await db
    .select({
      id: users.id,
      email: users.email,
      accountType: users.accountType,
      name: users.name,
    })
    .from(users)
    .where(eq(users.email, authUser.email))
    .limit(1);

  if (!dbUser) return NextResponse.json({ error: "No DB user for email" }, { status: 401 });
  if (dbUser.accountType !== "applicant") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return dbUser;
}

/** GET: list current student's applications (supports legacy rows with null applicant_user_id) */
export async function GET(req: NextRequest) {
  const dbUserOrResp = await getDbUserOrError(req);
  if (dbUserOrResp instanceof NextResponse) return dbUserOrResp;
  const dbUser = dbUserOrResp;

  const rows = await db
    .select({
      id: applications.id,
      status: applications.stage,
      updatedAt: applications.updatedAt,
      job: { id: jobs.id, title: jobs.title, locationMode: jobs.locationMode },
      organization: { id: organizations.id, name: organizations.name },
    })
    .from(applications)
    .leftJoin(jobs, eq(applications.jobId, jobs.id))
    .leftJoin(organizations, eq(jobs.orgId, organizations.id))
    .where(
      or(
        eq(applications.applicantUserId, dbUser.id),
        and(isNull(applications.applicantUserId), eq(applications.applicantEmail, dbUser.email))
      )
    )
    .orderBy(desc(applications.updatedAt));

  return NextResponse.json(rows);
}

/** POST: apply to a job as current student (idempotent; upgrades legacy rows) */
export async function POST(req: NextRequest) {
  const dbUserOrResp = await getDbUserOrError(req);
  if (dbUserOrResp instanceof NextResponse) return dbUserOrResp;
  const dbUser = dbUserOrResp;

  // Parse body from JSON or form
  const contentType = req.headers.get("content-type") || "";
  let jobId: number | null = null;

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    jobId = body?.jobId ? Number(body.jobId) : null;
  } else if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await req.formData();
    jobId = form.get("jobId") ? Number(form.get("jobId")) : null;
  }

  if (!jobId || Number.isNaN(jobId)) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  // Ensure job exists
  const [job] = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) return NextResponse.json({ error: "Invalid jobId" }, { status: 404 });

  // 1) If a proper application already exists for this user+job, return it (idempotent)
  const [existingForUser] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(and(eq(applications.jobId, jobId), eq(applications.applicantUserId, dbUser.id)))
    .limit(1);

  if (existingForUser) {
    return NextResponse.json({ ok: true, alreadyApplied: true, applicationId: existingForUser.id });
  }

  // 2) If a legacy row exists (null user id + same email+job), upgrade it to attach the user id
  const [legacy] = await db
    .select({ id: applications.id })
    .from(applications)
    .where(
      and(
        eq(applications.jobId, jobId),
        isNull(applications.applicantUserId),
        eq(applications.applicantEmail, dbUser.email)
      )
    )
    .limit(1);

  if (legacy) {
    await db
      .update(applications)
      .set({
        applicantUserId: dbUser.id,
        applicantName: dbUser.name ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, legacy.id));

    return NextResponse.json({ ok: true, upgradedLegacy: true, applicationId: legacy.id });
  }

  // 3) Otherwise, insert a fresh application bound to the user id
  const [inserted] = await db
    .insert(applications)
    .values({
      jobId,
      applicantUserId: dbUser.id,
      applicantEmail: dbUser.email,
      applicantName: dbUser.name ?? null,
      stage: "applied",
      source: "student-portal",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning({ id: applications.id });

  return NextResponse.json({ ok: true, applicationId: inserted.id });
}
