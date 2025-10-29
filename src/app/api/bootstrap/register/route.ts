import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  users,
  organizations,
  memberships,
  employerProfiles,
  studentProfiles,
} from "@/db/schema";
import { and, eq } from "drizzle-orm";

// naive slugify
function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      locale,
      accountType, // "applicant" | "employer"
      companyName,
      companyUrl,
      universityId,
    } = body as {
      name: string;
      email: string;
      phone?: string | null;
      locale?: string;
      accountType: "applicant" | "employer";
      companyName?: string;
      companyUrl?: string;
      universityId?: number | null;
    };

    const now = new Date();

    // 1) upsert users row
    const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    let appUserId: number;

    if (existingUser.length === 0) {
      const [inserted] = await db
        .insert(users)
        .values({
          email,
          name,
          phone: phone || null,
          locale: locale || "en",
          accountType: accountType || "applicant",
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      appUserId = inserted.id;
    } else {
      const u = existingUser[0];
      appUserId = u.id;
      // Keep name/phone fresh & set the chosen accountType
      await db
        .update(users)
        .set({
          name,
          phone: phone || null,
          locale: locale || u.locale,
          accountType: accountType || u.accountType,
          updatedAt: now,
        })
        .where(eq(users.id, appUserId));
    }

    // 2) branch by account type
    if (accountType === "applicant") {
      // ensure student profile
      const sp = await db
        .select()
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, appUserId))
        .limit(1);

      if (sp.length === 0) {
        await db.insert(studentProfiles).values({
          userId: appUserId,
          universityId: universityId ?? null,
          gradYear: null,
          program: null,
          verified: false,
          createdAt: now,
        });
      } else if (typeof universityId === "number") {
        await db
          .update(studentProfiles)
          .set({ universityId })
          .where(eq(studentProfiles.userId, appUserId));
      }

      return NextResponse.json({ ok: true, userId: appUserId, accountType: "applicant" });
    }

    // employer branch
    const orgName = (companyName || name || "Company").trim();
    const orgSlug = slugify(orgName) || `org-${appUserId}`;

    // find org by slug
    const existingOrg = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, orgSlug))
      .limit(1);

    let orgId: number;
    if (existingOrg.length === 0) {
      const [org] = await db
        .insert(organizations)
        .values({
          name: orgName,
          slug: orgSlug,
          type: "company",
          plan: "free",
          seatLimit: 10,
          createdAt: now,
          updatedAt: now,
        })
        .returning();
      orgId = org.id;

      await db.insert(employerProfiles).values({
        orgId,
        companyUrl: companyUrl || null,
        locations: null,
        industry: null,
        createdAt: now,
      });
    } else {
      orgId = existingOrg[0].id;
    }

    // ensure membership as admin
    const existingMembership = await db
      .select()
      .from(memberships)
      .where(and(eq(memberships.userId, appUserId), eq(memberships.orgId, orgId)))
      .limit(1);

    if (existingMembership.length === 0) {
      await db.insert(memberships).values({
        userId: appUserId,
        orgId,
        role: "admin",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
    }

    return NextResponse.json({ ok: true, userId: appUserId, orgId, accountType: "employer" });
  } catch (error) {
    console.error("POST /api/bootstrap/register error:", error);
    return NextResponse.json({ error: "Failed to bootstrap user" }, { status: 500 });
  }
}
