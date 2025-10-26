import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { studentProfiles, users } from "@/db/schema-pg";
import { getCurrentUser } from "@/lib/auth";

// Look up the numeric DB user (by email) and ensure it's an applicant
async function getDbUserOrThrow(req: NextRequest) {
  const authUser = await getCurrentUser(req);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [dbUser] = await db
    .select({
      id: users.id,
      email: users.email,
      accountType: users.accountType,
      name: users.name,
      phone: users.phone,
    })
    .from(users)
    .where(eq(users.email, authUser.email))
    .limit(1);

  if (!dbUser) return NextResponse.json({ error: "No DB user for email" }, { status: 401 });
  if (dbUser.accountType !== "applicant")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return dbUser;
}

// GET: return merged view { name, phone, program, universityId, gradYear, verified }
export async function GET(req: NextRequest) {
  const dbUserOrResp = await getDbUserOrThrow(req);
  if (dbUserOrResp instanceof NextResponse) return dbUserOrResp;
  const dbUser = dbUserOrResp;

  const [profile] = await db
    .select({
      program: studentProfiles.program,
      universityId: studentProfiles.universityId,
      gradYear: studentProfiles.gradYear,
      verified: studentProfiles.verified,
    })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, dbUser.id))
    .limit(1);

  return NextResponse.json({
    name: dbUser.name ?? "",
    phone: dbUser.phone ?? "",
    program: profile?.program ?? "",
    universityId: profile?.universityId ?? null,
    gradYear: profile?.gradYear ?? null,
    verified: profile?.verified ?? false,
  });
}

// POST: accept form data or JSON; update users + student_profiles; redirect back to page
export async function POST(req: NextRequest) {
  const dbUserOrResp = await getDbUserOrThrow(req);
  if (dbUserOrResp instanceof NextResponse) return dbUserOrResp;
  const dbUser = dbUserOrResp;

  const contentType = req.headers.get("content-type") || "";
  let name: string | null = null;
  let phone: string | null = null;
  let program: string | null = null;
  let gradYear: number | null = null;
  let universityId: number | null = null;

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({} as any));
    name = body?.name ?? null;
    phone = body?.phone ?? null;
    program = body?.program ?? body?.university ?? null;
    gradYear = body?.gradYear != null && body.gradYear !== "" ? Number(body.gradYear) : null;
    universityId =
      body?.universityId != null && body.universityId !== "" ? Number(body.universityId) : null;
  } else {
    const form = await req.formData();
    name = (form.get("name") as string) || null;
    phone = (form.get("phone") as string) || null;
    program = ((form.get("program") as string) || (form.get("university") as string)) ?? null;
    gradYear = form.get("gradYear") ? Number(form.get("gradYear")) : null;
    universityId = form.get("universityId") ? Number(form.get("universityId")) : null;
  }

  // Update users (name/phone)
  await db
    .update(users)
    .set({
      name: name ?? undefined,
      phone: phone ?? undefined,
    })
    .where(eq(users.id, dbUser.id));

  // Upsert student_profiles (program/universityId/gradYear)
  const [existing] = await db
    .select({ userId: studentProfiles.userId })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, dbUser.id))
    .limit(1);

  const payload = {
    program: program ?? undefined,
    universityId: universityId ?? undefined,
    gradYear: gradYear ?? undefined,
  };

  if (existing) {
    await db.update(studentProfiles).set(payload).where(eq(studentProfiles.userId, dbUser.id));
  } else {
    await db.insert(studentProfiles).values({ userId: dbUser.id, ...payload });
  }

  // ✅ Redirect back to the profile page so the server component re-fetches and shows updates
  const redirectUrl = new URL("/student/profile?saved=1", req.url);
  return NextResponse.redirect(redirectUrl, { status: 303 });
}
