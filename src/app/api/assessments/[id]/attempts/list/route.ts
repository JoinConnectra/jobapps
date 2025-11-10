import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { assessmentAttempts } from "@/db/schema-pg";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const assessmentId = Number(params.id);
  if (!Number.isFinite(assessmentId)) {
    return NextResponse.json({ error: "Invalid assessment id" }, { status: 400 });
  }

  const authUser = await getCurrentUser(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // resolve numeric app user
  const appUser = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, authUser.email),
    columns: { id: true },
  });
  if (!appUser?.id) return NextResponse.json({ error: "No app user" }, { status: 403 });

  // load assessment + membership
  const assess = await db.query.assessments.findFirst({
    where: (a, { eq }) => eq(a.id, assessmentId),
  });
  if (!assess) return NextResponse.json({ error: "Assessment not found" }, { status: 404 });

  const member = await db.query.memberships.findFirst({
    where: (m, { and, eq }) => and(eq(m.orgId, assess.orgId), eq(m.userId, appUser.id)),
    columns: { id: true },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await db
    .select({
      id: assessmentAttempts.id,
      candidateId: assessmentAttempts.candidateId,
      status: assessmentAttempts.status,
      submittedAt: assessmentAttempts.submittedAt,
      autoScoreTotal: assessmentAttempts.autoScoreTotal,
    })
    .from(assessmentAttempts)
    .where(eq(assessmentAttempts.assessmentId, assessmentId));

  return NextResponse.json(rows);
}
