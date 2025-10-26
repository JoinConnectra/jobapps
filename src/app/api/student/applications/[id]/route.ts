import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { applications, jobs, organizations, users } from "@/db/schema-pg";
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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const dbUserOrResp = await getDbUserOrThrow(req);
  if ("json" in dbUserOrResp) return dbUserOrResp as NextResponse;
  const dbUser = dbUserOrResp;

  const [row] = await db
    .select({
      id: applications.id,
      status: applications.stage,
      createdAt: applications.createdAt,
      updatedAt: applications.updatedAt,
      resumeS3Key: applications.resumeS3Key,
      resumeFilename: applications.resumeFilename,
      resumeMime: applications.resumeMime,
      resumeSize: applications.resumeSize,
      job: { id: jobs.id, title: jobs.title, descriptionMd: jobs.descriptionMd },
      organization: { id: organizations.id, name: organizations.name },
    })
    .from(applications)
    .leftJoin(jobs, eq(applications.jobId, jobs.id))
    .leftJoin(organizations, eq(jobs.orgId, organizations.id))
    .where(and(eq(applications.id, Number(params.id)), eq(applications.applicantUserId, dbUser.id)));

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const dbUserOrResp = await getDbUserOrThrow(req);
  if ("json" in dbUserOrResp) return dbUserOrResp as NextResponse;
  const dbUser = dbUserOrResp;

  const body = await req.json();

  await db
    .update(applications)
    .set({
      stage: body.stage, // e.g. 'withdrawn'
      expectedSalaryPkr: body.expectedSalaryPkr ?? undefined,
      noticePeriodDays: body.noticePeriodDays ?? undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(applications.id, Number(params.id)), eq(applications.applicantUserId, dbUser.id)));

  return NextResponse.json({ ok: true });
}
