// /src/app/api/assessments/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { and, desc, eq } from "drizzle-orm";
import { assessments, memberships, users } from "@/db/schema-pg";
import { getCurrentUser } from "@/lib/auth";

// ---------- helpers ----------
function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}
const badRequest  = (m: string, c = "BAD_REQUEST")    => jsonError(400, c, m);
const unauthorized= (m = "Unauthorized", c="UNAUTHORIZED") => jsonError(401, c, m);
const forbidden   = (m = "Forbidden", c="FORBIDDEN")       => jsonError(403, c, m);
const serverError = (m = "Internal Server Error", c="SERVER_ERROR") => jsonError(500, c, m);

// ---------- common: resolve app user (numeric id) from auth user ----------
async function resolveAppUserId(req: NextRequest): Promise<number | null> {
  const authUser = await getCurrentUser(req);
  if (!authUser) return null;

  const appUser = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.email, authUser.email),
    columns: { id: true },
  });

  return appUser?.id ?? null;
}

// ---------- GET /api/assessments?orgId=...&limit=&offset= ----------
export async function GET(req: NextRequest) {
  try {
    const appUserId = await resolveAppUserId(req);
    if (!appUserId) return unauthorized();

    const { searchParams } = new URL(req.url);
    const orgIdStr = searchParams.get("orgId");
    const limitStr = searchParams.get("limit");
    const offsetStr = searchParams.get("offset");

    if (!orgIdStr) return badRequest("Missing orgId");
    const orgId = Number(orgIdStr);
    if (!Number.isFinite(orgId) || orgId <= 0) return badRequest("Invalid orgId");

    const limit = Math.min(Number(limitStr ?? 20) || 20, 100);
    const offset = Number(offsetStr ?? 0) || 0;

    // membership check using numeric app user id
    const member = await db.query.memberships.findFirst({
      where: (m, { and, eq }) => and(eq(m.orgId, orgId), eq(m.userId, appUserId)),
      columns: { id: true },
    });
    if (!member) return forbidden("You are not a member of this organization");

    const rows = await db
      .select()
      .from(assessments)
      .where(eq(assessments.orgId, orgId))
      .orderBy(desc(assessments.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(rows);
  } catch (err) {
    console.error("[GET /api/assessments] error:", err);
    return serverError();
  }
}

// ---------- POST /api/assessments ----------
/**
 * Body:
 * {
 *   orgId: number,
 *   title: string,
 *   type: string,         // "MCQ" | "Coding" | "Case Study" | ...
 *   duration: string,     // e.g., "30 min"
 *   descriptionMd?: string,
 *   jobId?: number,
 *   status?: string,      // default "Draft"
 *   isPublished?: boolean
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const appUserId = await resolveAppUserId(req);
    if (!appUserId) return unauthorized();

    const body = await req.json().catch(() => null);
    if (!body) return badRequest("Invalid JSON body");

    const {
      orgId,
      title,
      type,
      duration,
      descriptionMd,
      jobId,
      status,
      isPublished,
    } = body as {
      orgId?: number;
      title?: string;
      type?: string;
      duration?: string;
      descriptionMd?: string;
      jobId?: number;
      status?: string;
      isPublished?: boolean;
    };

    if (!orgId) return badRequest("orgId is required");
    if (!title || !title.trim()) return badRequest("title is required");
    if (!type || !type.trim()) return badRequest("type is required");
    if (!duration || !duration.trim()) return badRequest("duration is required");

    // membership check
    const member = await db.query.memberships.findFirst({
      where: (m, { and, eq }) => and(eq(m.orgId, orgId), eq(m.userId, appUserId)),
      columns: { id: true },
    });
    if (!member) return forbidden("You are not a member of this organization");

    const [created] = await db
      .insert(assessments)
      .values({
        orgId,
        jobId: jobId ?? null,
        title: title.trim(),
        type: type.trim(),
        duration: duration.trim(),
        status: (status ?? "Draft").trim(),
        descriptionMd: descriptionMd ?? null,
        isPublished: isPublished ?? false,
        createdBy: appUserId, // numeric
        // createdAt/updatedAt default at DB side
      })
      .returning();

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("[POST /api/assessments] error:", err);
    return serverError();
  }
}
