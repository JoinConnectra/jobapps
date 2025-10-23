import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, organizations, memberships, employerProfiles, studentProfiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, locale, accountType, companyName, companyUrl, universityId } = body;

    const now = new Date();

    // ensure app user exists (separate from auth user)
    let appUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (appUser.length === 0) {
      const inserted = await db.insert(users).values({
        email,
        name: name || email,
        phone: phone || null,
        locale: locale || "en",
        avatarUrl: null,
        accountType: accountType,
        createdAt: now,
        updatedAt: now,
      }).returning();
      appUser = inserted as any;
    }

    // if applicant and provided university, store in student profile
    if (accountType === "applicant" && universityId) {
      await db.insert(studentProfiles).values({
        userId: appUser[0].id,
        universityId: parseInt(String(universityId)),
        createdAt: now,
      });
    }

    // if employer, create org and membership
    if (accountType === "employer") {
      const slug = (companyName || email).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const org = await db.insert(organizations).values({
        name: companyName || name || email,
        slug,
        type: "company",
        plan: "free",
        seatLimit: 5,
        createdAt: now,
        updatedAt: now,
      }).returning();

      await db.insert(employerProfiles).values({
        orgId: org[0].id,
        companyUrl: companyUrl || null,
        locations: null,
        industry: null,
        createdAt: now,
      });

      await db.insert(memberships).values({
        userId: appUser[0].id,
        orgId: org[0].id,
        role: "admin",
        createdAt: now,
      });

      return NextResponse.json({ ok: true, orgId: org[0].id });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/bootstrap/register error:", error);
    return NextResponse.json({ error: "Failed to bootstrap user" }, { status: 500 });
  }
}
