import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  studentProfiles,
  users,
  studentExperiences,
  studentEducations,
  studentLinks,
} from "@/db/schema-pg";
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

/* ---------- GET: merged profile (includes standard app fields) ---------- */
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
      locationCity: studentProfiles.locationCity,
      locationCountry: studentProfiles.locationCountry,
      websiteUrl: studentProfiles.websiteUrl,
      resumeUrl: studentProfiles.resumeUrl,
      isPublic: studentProfiles.isPublic,
      jobPrefs: studentProfiles.jobPrefs,
      skills: studentProfiles.skills,

      // Standard app fields
      whatsapp: studentProfiles.whatsapp,
      province: studentProfiles.province,
      cnic: studentProfiles.cnic,
      linkedinUrl: studentProfiles.linkedinUrl,
      portfolioUrl: studentProfiles.portfolioUrl,
      githubUrl: studentProfiles.githubUrl,
      workAuth: studentProfiles.workAuth,
      needSponsorship: studentProfiles.needSponsorship,
      willingRelocate: studentProfiles.willingRelocate,
      remotePref: studentProfiles.remotePref,
      earliestStart: studentProfiles.earliestStart,
      salaryExpectation: studentProfiles.salaryExpectation,
      expectedSalaryPkr: studentProfiles.expectedSalaryPkr,
      noticePeriodDays: studentProfiles.noticePeriodDays,
      experienceYears: studentProfiles.experienceYears,
    })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, me.id))
    .limit(1);

  const exp = await db
    .select()
    .from(studentExperiences)
    .where(eq(studentExperiences.userId, me.id))
    .orderBy(desc(studentExperiences.startDate));

  const edu = await db
    .select()
    .from(studentEducations)
    .where(eq(studentEducations.userId, me.id))
    .orderBy(desc(studentEducations.endYear), desc(studentEducations.startYear));

  const links = await db
    .select()
    .from(studentLinks)
    .where(eq(studentLinks.userId, me.id))
    .orderBy(desc(studentLinks.createdAt));

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
    // standard app defaults
    whatsapp: p?.whatsapp ?? "",
    province: p?.province ?? "",
    cnic: p?.cnic ?? "",
    linkedinUrl: p?.linkedinUrl ?? "",
    portfolioUrl: p?.portfolioUrl ?? "",
    githubUrl: p?.githubUrl ?? "",
    workAuth: p?.workAuth ?? "",
    needSponsorship: p?.needSponsorship ?? null,
    willingRelocate: p?.willingRelocate ?? null,
    remotePref: p?.remotePref ?? "",
    earliestStart: p?.earliestStart ?? null,
    salaryExpectation: p?.salaryExpectation ?? "",
    expectedSalaryPkr: p?.expectedSalaryPkr ?? null,
    noticePeriodDays: p?.noticePeriodDays ?? null,
    experienceYears: p?.experienceYears ?? null,
    // related
    experiences: exp,
    educations: edu,
    links,
  });
}

/* ---------- POST: upsert profile (primary + standard app fields) ---------- */
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
    // users
    name, phone,

    // core
    program, gradYear, universityId,
    headline, about,
    locationCity, locationCountry,
    websiteUrl, resumeUrl,
    isPublic, skills, jobPrefs,

    // standard app fields
    whatsapp, province, cnic,
    linkedinUrl, portfolioUrl, githubUrl,
    workAuth, needSponsorship, willingRelocate,
    remotePref, earliestStart,
    salaryExpectation, expectedSalaryPkr,
    noticePeriodDays, experienceYears,
  } = body;

  /* ---------- users update (guard against empty .set) ---------- */
  const userUpdate: Record<string, any> = {};
  if (name !== undefined) userUpdate.name = name;
  if (phone !== undefined) userUpdate.phone = phone;
  if (Object.keys(userUpdate).length > 0) {
    await db.update(users).set(userUpdate).where(eq(users.id, me.id));
  }

  /* ---------- parse helpers ---------- */
  let parsedSkills: string[] | undefined = undefined;
  if (Array.isArray(skills)) {
    parsedSkills = skills.filter(Boolean).map((s: any) => String(s).trim());
  } else if (typeof skills === "string" && skills.trim()) {
    parsedSkills = skills.split(",").map((s: string) => s.trim()).filter(Boolean);
  }

  let parsedPrefs: any | undefined = undefined;
  if (typeof jobPrefs === "string" && jobPrefs.trim()) {
    try { parsedPrefs = JSON.parse(jobPrefs); } catch {}
  } else if (jobPrefs && typeof jobPrefs === "object") {
    parsedPrefs = jobPrefs;
  }

  /* ---------- profile payload ---------- */
  const payload: Record<string, any> = {
    program: program ?? undefined,
    universityId: universityId ? Number(universityId) : undefined,
    gradYear: gradYear ? Number(gradYear) : undefined,
    headline: headline ?? undefined,
    about: about ?? undefined,
    locationCity: locationCity ?? undefined,
    locationCountry: locationCountry ?? undefined,
    websiteUrl: websiteUrl ?? undefined,
    resumeUrl: resumeUrl ?? undefined,
    isPublic: typeof isPublic === "string" ? isPublic === "true" : isPublic ?? undefined,
    skills: parsedSkills ?? undefined,
    jobPrefs: parsedPrefs ?? undefined,

    // standard app fields
    whatsapp: whatsapp ?? undefined,
    province: province ?? undefined,
    cnic: cnic ?? undefined,
    linkedinUrl: linkedinUrl ?? undefined,
    portfolioUrl: portfolioUrl ?? undefined,
    githubUrl: githubUrl ?? undefined,
    workAuth: workAuth ?? undefined,
    needSponsorship:
      typeof needSponsorship === "string"
        ? (needSponsorship === "true" ? true : needSponsorship === "false" ? false : undefined)
        : needSponsorship ?? undefined,
    willingRelocate:
      typeof willingRelocate === "string"
        ? (willingRelocate === "true" ? true : willingRelocate === "false" ? false : undefined)
        : willingRelocate ?? undefined,
    remotePref: remotePref ?? undefined,
    earliestStart: earliestStart ? new Date(String(earliestStart)) : undefined,
    salaryExpectation: salaryExpectation ?? undefined,
    expectedSalaryPkr: expectedSalaryPkr != null ? Number(expectedSalaryPkr) : undefined,
    noticePeriodDays: noticePeriodDays != null ? Number(noticePeriodDays) : undefined,
    experienceYears: experienceYears != null ? Number(experienceYears) : undefined,
  };

  // Strip undefined keys to avoid empty .set({})
  for (const k of Object.keys(payload)) {
    if (payload[k] === undefined) delete payload[k];
  }

  const [exists] = await db
    .select({ userId: studentProfiles.userId })
    .from(studentProfiles)
    .where(eq(studentProfiles.userId, me.id))
    .limit(1);

  if (exists) {
    if (Object.keys(payload).length > 0) {
      await db.update(studentProfiles).set(payload).where(eq(studentProfiles.userId, me.id));
    }
  } else {
    await db.insert(studentProfiles).values({ userId: me.id, ...payload });
  }

  // XHR gets JSON, normal browser form POSTs get redirect
  const wantsJson = (req.headers.get("accept") || "").includes("application/json");
  if (wantsJson) {
    return NextResponse.json({ saved: true });
  }
  const redirectUrl = new URL("/student/profile?saved=1", req.url);
  return NextResponse.redirect(redirectUrl, { status: 303 });
}
