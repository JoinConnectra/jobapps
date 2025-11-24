// src/app/api/university/students/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  studentProfiles,
  users,
  applications,
  jobs,
  organizations,
  studentExperiences,
  studentEducations,
  studentLinks,
  eventRegistrations,
  eventCheckins,
  savedJobs,
} from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ Await params because Next.js passes it as a Promise
    const { id } = await context.params;
    const idNum = Number(id);

    if (!idNum || Number.isNaN(idNum)) {
      return NextResponse.json(
        { error: "Invalid student id" },
        { status: 400 }
      );
    }

    // 1) Load the student profile + user info (rich fields)
    const [studentRow] = await db
      .select({
        id: studentProfiles.id,
        userId: studentProfiles.userId,
        universityId: studentProfiles.universityId,
        program: studentProfiles.program,
        gradYear: studentProfiles.gradYear,
        resumeUrl: studentProfiles.resumeUrl,
        verified: studentProfiles.verified,
        createdAt: studentProfiles.createdAt,

        // Rich profile
        headline: studentProfiles.headline,
        about: studentProfiles.about,
        locationCity: studentProfiles.locationCity,
        locationCountry: studentProfiles.locationCountry,
        websiteUrl: studentProfiles.websiteUrl,
        skills: studentProfiles.skills,
        whatsapp: studentProfiles.whatsapp,
        province: studentProfiles.province,
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

        name: users.name,
        email: users.email,
      })
      .from(studentProfiles)
      .leftJoin(users, eq(studentProfiles.userId, users.id))
      .where(eq(studentProfiles.id, idNum));

    if (!studentRow) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // 2) Load this student's applications (by userId)
    const apps = await db
      .select({
        id: applications.id,
        jobId: applications.jobId,
        stage: applications.stage,
        createdAt: applications.createdAt,

        jobTitle: jobs.title,
        companyName: organizations.name,
      })
      .from(applications)
      .leftJoin(jobs, eq(applications.jobId, jobs.id))
      .leftJoin(organizations, eq(jobs.orgId, organizations.id))
      .where(eq(applications.applicantUserId, studentRow.userId))
      .orderBy(desc(applications.createdAt));

    // 🔹 Compute application stats in TS
    const totalApplications = apps.length;

    const CLOSED_STAGES = ["rejected", "withdrawn", "ghosted", "no_show"];
    const activeApplications = apps.filter((a) => {
      if (!a.stage) return true;
      const s = a.stage.toLowerCase();
      return !CLOSED_STAGES.includes(s);
    }).length;

    let lastApplicationAt: string | null = null;
    if (apps.length > 0) {
      const newest = apps[0]; // because we ordered desc(createdAt)
      if (newest.createdAt instanceof Date) {
        lastApplicationAt = newest.createdAt.toISOString();
      } else if (typeof newest.createdAt === "string") {
        lastApplicationAt = newest.createdAt;
      }
    }

    // 3) Events stats (registered / attended) using email
    let eventsRegistered = 0;
    let eventsAttended = 0;

    if (studentRow.email) {
      const [regRow] = await db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(eventRegistrations)
        .where(eq(eventRegistrations.userEmail, studentRow.email));

      const [checkRow] = await db
        .select({
          count: sql<number>`count(*)`,
        })
        .from(eventCheckins)
        .where(eq(eventCheckins.userEmail, studentRow.email));

      eventsRegistered = Number(
        (regRow?.count as unknown as number | string) ?? 0
      );
      eventsAttended = Number(
        (checkRow?.count as unknown as number | string) ?? 0
      );
    }

    // 4) Saved jobs count
    const [savedRow] = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(savedJobs)
      .where(eq(savedJobs.userId, studentRow.userId));

    const savedJobsCount = Number(
      (savedRow?.count as unknown as number | string) ?? 0
    );

    // 5) Load experiences
    const experiences = await db
      .select({
        id: studentExperiences.id,
        title: studentExperiences.title,
        company: studentExperiences.company,
        startDate: studentExperiences.startDate,
        endDate: studentExperiences.endDate,
        isCurrent: studentExperiences.isCurrent,
        location: studentExperiences.location,
      })
      .from(studentExperiences)
      .where(eq(studentExperiences.userId, studentRow.userId))
      .orderBy(desc(studentExperiences.startDate));

    // 6) Load educations
    const educations = await db
      .select({
        id: studentEducations.id,
        school: studentEducations.school,
        degree: studentEducations.degree,
        field: studentEducations.field,
        startYear: studentEducations.startYear,
        endYear: studentEducations.endYear,
        gpa: studentEducations.gpa,
      })
      .from(studentEducations)
      .where(eq(studentEducations.userId, studentRow.userId))
      .orderBy(desc(studentEducations.endYear));

    // 7) Load custom links
    const links = await db
      .select({
        id: studentLinks.id,
        label: studentLinks.label,
        url: studentLinks.url,
      })
      .from(studentLinks)
      .where(eq(studentLinks.userId, studentRow.userId));

    return NextResponse.json({
      student: studentRow,
      applications: apps,
      experiences,
      educations,
      links,
      stats: {
        totalApplications,
        activeApplications,
        lastApplicationAt,
        eventsRegistered,
        eventsAttended,
        savedJobsCount,
      },
    });
  } catch (error) {
    console.error("GET /api/university/students/[id] error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
