import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { users, studentExperiences } from "@/db/schema-pg";
import { getCurrentUser } from "@/lib/auth";

async function me(req: NextRequest) {
  const auth = await getCurrentUser(req);
  if (!auth?.email) return null;
  const [u] = await db
    .select({
      id: users.id,
      accountType: users.accountType,
      email: users.email,
    })
    .from(users)
    .where(eq(users.email, auth.email))
    .limit(1);
  if (!u || u.accountType !== "applicant") return null;
  return u;
}

/* ---------------- GET ---------------- */
export async function GET(req: NextRequest) {
  const u = await me(req);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db
    .select()
    .from(studentExperiences)
    .where(eq(studentExperiences.userId, u.id));
  return NextResponse.json(rows);
}

/* ---------------- POST ---------------- */
export async function POST(req: NextRequest) {
  const u = await me(req);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  // ✅ FIX 1: ensure we pass a plain object, not array, and use string dates
  const inserted = await db
    .insert(studentExperiences)
    .values({
      userId: Number(u.id),
      title: body.title ?? "",
      company: body.company ?? null,
      startDate: body.startDate ? String(body.startDate) : null,
      endDate: body.endDate ? String(body.endDate) : null,
      isCurrent: !!body.isCurrent,
      location: body.location ?? null,
      description: body.description ?? null,
    })
    .returning();

  return NextResponse.json(inserted[0]);
}

/* ---------------- PATCH ---------------- */
export async function PATCH(req: NextRequest) {
  const u = await me(req);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.id)
    return NextResponse.json({ error: "id required" }, { status: 400 });

  await db
    .update(studentExperiences)
    .set({
      title: body.title ?? undefined,
      company: body.company ?? undefined,
      startDate:
        body.startDate !== undefined
          ? body.startDate
            ? String(body.startDate)
            : null
          : undefined,
      endDate:
        body.endDate !== undefined
          ? body.endDate
            ? String(body.endDate)
            : null
          : undefined,
      isCurrent:
        typeof body.isCurrent === "boolean" ? body.isCurrent : undefined,
      location: body.location ?? undefined,
      description: body.description ?? undefined,
    })
    .where(
      and(
        eq(studentExperiences.id, Number(body.id)),
        eq(studentExperiences.userId, u.id)
      )
    );

  return NextResponse.json({ ok: true });
}

/* ---------------- DELETE ---------------- */
export async function DELETE(req: NextRequest) {
  const u = await me(req);
  if (!u) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json().catch(() => ({}));
  if (!id)
    return NextResponse.json({ error: "id required" }, { status: 400 });

  await db
    .delete(studentExperiences)
    .where(
      and(
        eq(studentExperiences.id, Number(id)),
        eq(studentExperiences.userId, u.id)
      )
    );

  return NextResponse.json({ ok: true });
}
