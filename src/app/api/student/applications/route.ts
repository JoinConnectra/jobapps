import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, jobs, organizations, users } from "@/db/schema-pg";
import { getCurrentUser } from "@/lib/auth";

async function getDbUserOrThrow(req: NextRequest) {
  const authUser = await getCurrentUser(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [dbUser] = await db
    .select({ id: users.id, email: users.email, accountType: users.accountType, name: users.name })
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
      id: applications.id,
      status: applications.stage,
      updatedAt: applications.updatedAt,
      job: { id: jobs.id, title: jobs.title, locationMode: jobs.locationMode },
      organization: { id: organizations.id, name: organizations.name },
    })
    .from(applications)
    .leftJoin(jobs, eq(applications.jobId, jobs.id))
    .leftJoin(organizations, eq(jobs.orgId, organizations.id))
    .where(eq(applications.applicantUserId, dbUser.id))
    .orderBy(desc(applications.updatedAt));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const dbUserOrResp = await getDbUserOrThrow(req);
  if ("json" in dbUserOrResp) return dbUserOrResp as NextResponse;

  // Accept JSON or form
  let jobId: number | null = null;
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await req.json();
    jobId = body?.jobId ? Number(body.jobId) : null;
  } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    jobId = form.get("jobId") ? Number(form.get("jobId")) : null;
  }
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const dbUser = dbUserOrResp;

  await db.insert(applications).values({
    jobId,
    applicantUserId: dbUser.id,
    applicantEmail: dbUser.email,
    applicantName: dbUser.name ?? null,
    stage: "applied",
    source: "student-portal",
  });

  return NextResponse.json({ ok: true });
}
