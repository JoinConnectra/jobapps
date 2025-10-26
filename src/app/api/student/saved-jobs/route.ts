// src/app/api/student/saved-jobs/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { savedJobs, jobs, organizations, users } from "@/db/schema-pg";
import { getCurrentUser } from "@/lib/auth";

async function getDbUserOrThrow(req: NextRequest) {
  const authUser = await getCurrentUser(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [dbUser] = await db
    .select({ id: users.id, email: users.email, accountType: users.accountType })
    .from(users)
    .where(eq(users.email, authUser.email))
    .limit(1);

  if (!dbUser) return NextResponse.json({ error: "No DB user for email" }, { status: 401 });
  if (dbUser.accountType !== "applicant")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return dbUser;
}

export async function GET(req: NextRequest) {
  const dbUserOrResp = await getDbUserOrThrow(req);
  if ("json" in dbUserOrResp) return dbUserOrResp as NextResponse;
  const dbUser = dbUserOrResp;

  const rows = await db
    .select({
      id: savedJobs.id,
      createdAt: savedJobs.createdAt,
      job: { id: jobs.id, title: jobs.title, locationMode: jobs.locationMode, orgId: jobs.orgId },
      organization: { id: organizations.id, name: organizations.name },
    })
    .from(savedJobs)
    .leftJoin(jobs, eq(savedJobs.jobId, jobs.id))
    .leftJoin(organizations, eq(jobs.orgId, organizations.id))
    .where(eq(savedJobs.userId, dbUser.id));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const dbUserOrResp = await getDbUserOrThrow(req);
  if ("json" in dbUserOrResp) return dbUserOrResp as NextResponse;
  const dbUser = dbUserOrResp;

  let jobId: number | null = null;

  // Support JSON or form submissions
  const ct = req.headers.get("content-type") || "";
  try {
    if (ct.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      if (body?.jobId != null) jobId = Number(body.jobId);
    } else {
      const form = await req.formData();
      const val = form.get("jobId");
      if (val != null) jobId = Number(val);
    }
  } catch {
    // fall through to validation error below
  }

  if (!jobId || Number.isNaN(jobId)) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  await db
    .insert(savedJobs)
    .values({ userId: dbUser.id, jobId })
    .onConflictDoNothing?.();

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const dbUserOrResp = await getDbUserOrThrow(req);
  if ("json" in dbUserOrResp) return dbUserOrResp as NextResponse;
  const dbUser = dbUserOrResp;

  // Accept jobId either as query param or form body
  const url = new URL(req.url);
  let jobIdStr = url.searchParams.get("jobId");
  if (!jobIdStr) {
    const ct = req.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const body = await req.json().catch(() => ({}));
      if (body?.jobId != null) jobIdStr = String(body.jobId);
    } else {
      const form = await req.formData().catch(() => null);
      const v = form?.get("jobId");
      if (v != null) jobIdStr = String(v);
    }
  }

  const jobId = jobIdStr ? Number(jobIdStr) : NaN;
  if (!jobId || Number.isNaN(jobId)) {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  await db
    .delete(savedJobs)
    .where(and(eq(savedJobs.userId, dbUser.id), eq(savedJobs.jobId, jobId)));

  return NextResponse.json({ ok: true });
}
