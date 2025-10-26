import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, eq, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { applications, jobs, organizations, users } from "@/db/schema-pg";
import { getCurrentUser } from "@/lib/auth";

async function getDbUserOrError(req: NextRequest) {
  const authUser = await getCurrentUser(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [dbUser] = await db
    .select({ id: users.id, email: users.email, accountType: users.accountType })
    .from(users)
    .where(eq(users.email, authUser.email))
    .limit(1);

  if (!dbUser) return NextResponse.json({ error: "No DB user for email" }, { status: 401 });
  if (dbUser.accountType !== "applicant") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return dbUser;
}

/** Allow reading a single application if it belongs to this user.
 *  Legacy-safe: also allow if applicant_user_id is NULL but applicant_email matches.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const dbUserOrResp = await getDbUserOrError(req);
  if (dbUserOrResp instanceof NextResponse) return dbUserOrResp;
  const dbUser = dbUserOrResp;

  const appId = Number(params.id);
  if (!appId || Number.isNaN(appId)) {
    return NextResponse.json({ error: "Bad application id" }, { status: 400 });
  }

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
    .where(
      and(
        eq(applications.id, appId),
        or(
          eq(applications.applicantUserId, dbUser.id),
          and(isNull(applications.applicantUserId), eq(applications.applicantEmail, dbUser.email))
        )
      )
    )
    .limit(1);

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(row);
}

/** Allow updating only if this user owns it (also legacy-safe on first load) */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const dbUserOrResp = await getDbUserOrError(req);
  if (dbUserOrResp instanceof NextResponse) return dbUserOrResp;
  const dbUser = dbUserOrResp;

  const appId = Number(params.id);
  if (!appId || Number.isNaN(appId)) {
    return NextResponse.json({ error: "Bad application id" }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));

  // First "claim" a legacy row if necessary
  await db
    .update(applications)
    .set({
      applicantUserId: dbUser.id,
    })
    .where(
      and(
        eq(applications.id, appId),
        isNull(applications.applicantUserId),
        eq(applications.applicantEmail, dbUser.email)
      )
    );

  // Then update it (owned by this user now)
  await db
    .update(applications)
    .set({
      stage: body.stage ?? undefined, // e.g. 'withdrawn'
      expectedSalaryPkr: body.expectedSalaryPkr ?? undefined,
      noticePeriodDays: body.noticePeriodDays ?? undefined,
      updatedAt: new Date(),
    })
    .where(and(eq(applications.id, appId), eq(applications.applicantUserId, dbUser.id)));

  return NextResponse.json({ ok: true });
}
