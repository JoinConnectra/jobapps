import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { studentProfiles, users, studentExperiences, studentEducations, studentLinks } from "@/db/schema-pg";
import { getCurrentUser } from "@/lib/auth";

/* ---------- auth helper ---------- */
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
  if (dbUser.accountType !== "applicant") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return dbUser;
}

/* ---------- GET: merged profile ---------- */
export async function GET(req: NextRequest) {
  const dbUserOrResp = await getDbUserOrThrow(req);
  if (dbUserOrResp instanceof NextResponse) return dbUserOrResp;
  const me = dbUserOrResp;

  const [p] = await db
    .select({
      program: studentProfiles.program,
      universityId: studentProfiles.universityId,
      gradYear: studentProfiles.gradYear,
      verified: studentProfiles.verified,
      headline: studentProfiles.headline,
      about: studentProfiles.about,
      locationCity: studentProfiles.locationCity,       // <-- camel
    locationCountry: studentProfiles.locationCountry, // <-- camel
    websiteUrl: studentProfiles.websiteUrl,           // <-- camel
    resumeUrl: studentProfiles.resumeUrl,             // <-- camel
    isPublic: studentProfiles.isPublic,               // <-- camel
    jobPrefs: studentProfiles.jobPrefs,               // <-- camel
    skills: studentProfiles.skills, 
    })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, me.id))
    .limit(1);

  // Load experiences / educations / links
  const exp = await db
    .select()
    .from(studentExperiences)
    .where(eq(studentExperiences.userId, me.id))
    .orderBy(studentExperiences.startDate);

  const edu = await db
    .select()
    .from(studentEducations)
    .where(eq(studentEducations.userId, me.id))
    .orderBy(studentEducations.startYear);

  const links = await db
    .select()
    .from(studentLinks)
    .where(eq(studentLinks.userId, me.id));

  return NextResponse.json({
    // users table
    name: me.name ?? "",
    phone: me.phone ?? "",
    // profiles table
    program: p?.program ?? "",
    universityId: p?.universityId ?? null,
    gradYear: p?.gradYear ?? null,
    verified: p?.verified ?? false,
    headline: p?.headline ?? "",
    about: p?.about ?? "",
    locationCity: p?.locationCity ?? "",
    locationCountry: p?.locationCountry ?? "",
    websiteUrl: p?.websiteUrl ?? "",
    resumeUrl: p?.resumeUrl ?? "",
    isPublic: p?.isPublic ?? false,
    jobPrefs: p?.jobPrefs ?? {},
    skills: p?.skills ?? [],
    // related
    experiences: exp,
    educations: edu,
    links,
  });
}

/* ---------- POST: update primary profile fields ---------- */
export async function POST(req: NextRequest) {
  const dbUserOrResp = await getDbUserOrThrow(req);
  if (dbUserOrResp instanceof NextResponse) return dbUserOrResp;
  const me = dbUserOrResp;

  const contentType = req.headers.get("content-type") || "";
  let body: any = {};
  if (contentType.includes("application/json")) {
    body = await req.json().catch(() => ({}));
  } else {
    const form = await req.formData();
    form.forEach((v, k) => (body[k] = v));
  }

  const {
    name,
    phone,
    program,
    gradYear,
    universityId,
    headline,
    about,
    locationCity,
    locationCountry,
    websiteUrl,
    resumeUrl,
    isPublic,
    skills,           // array or comma-separated
    jobPrefs,         // object or JSON string
  } = body;

  // Upsert users
  await db.update(users).set({
    name: name ?? undefined,
    phone: phone ?? undefined,
  }).where(eq(users.id, me.id));

  // Prepare profile payload
  let parsedSkills: string[] | undefined = undefined;
  if (Array.isArray(skills)) parsedSkills = skills.filter(Boolean).map((s: any) => String(s).trim());
  else if (typeof skills === "string" && skills.trim()) parsedSkills = skills.split(",").map(s => s.trim()).filter(Boolean);

  let parsedPrefs: any | undefined = undefined;
  if (typeof jobPrefs === "string" && jobPrefs.trim()) {
    try { parsedPrefs = JSON.parse(jobPrefs); } catch {}
  } else if (jobPrefs && typeof jobPrefs === "object") {
    parsedPrefs = jobPrefs;
  }

  const payload: any = {
    program: program ?? undefined,
    universityId: universityId ? Number(universityId) : undefined,
    gradYear: gradYear ? Number(gradYear) : undefined,
    headline: headline ?? undefined,
    about: about ?? undefined,
    location_city: locationCity ?? undefined,
    location_country: locationCountry ?? undefined,
    website_url: websiteUrl ?? undefined,
    resume_url: resumeUrl ?? undefined,
    is_public: typeof isPublic === "string" ? isPublic === "true" : isPublic ?? undefined,
    skills: parsedSkills ?? undefined,
    job_prefs: parsedPrefs ?? undefined,
  };

  const [exists] = await db
    .select({ userId: studentProfiles.userId })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, me.id))
    .limit(1);

  if (exists) {
    await db.update(studentProfiles).set(payload).where(eq(studentProfiles.userId, me.id));
  } else {
    await db.insert(studentProfiles).values({ userId: me.id, ...payload });
  }

  const redirectUrl = new URL("/student/profile?saved=1", req.url);
  return NextResponse.redirect(redirectUrl, { status: 303 });
}
