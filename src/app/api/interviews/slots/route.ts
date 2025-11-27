import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  interviewSlots,
  interviewBookings,
  applications,
  users,
  jobs,
} from "@/db/schema-pg";
import { desc, eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orgIdParam = searchParams.get("orgId");

  try {
    const orgId = orgIdParam ? Number(orgIdParam) : null;
    if (orgIdParam && Number.isNaN(orgId)) {
      return NextResponse.json(
        { error: "orgId must be a valid number" },
        { status: 400 },
      );
    }

    const whereClause = orgId
      ? eq(interviewSlots.orgId, orgId)
      : undefined;

    const rows = await db
      .select({
        id: interviewSlots.id,
        orgId: interviewSlots.orgId,
        jobId: interviewSlots.jobId,
        createdByUserId: interviewSlots.createdByUserId,
        startAt: interviewSlots.startAt,
        endAt: interviewSlots.endAt,
        locationType: interviewSlots.locationType,
        locationDetail: interviewSlots.locationDetail,
        maxCandidates: interviewSlots.maxCandidates,
        status: interviewSlots.status,
        notes: interviewSlots.notes,
        // joined candidate / application meta
        applicationId: applications.id,
        candidateName: applications.applicantName,
        candidateEmail: applications.applicantEmail,
        candidateStage: applications.stage,
        // job meta
        jobTitle: jobs.title,
      })
      .from(interviewSlots)
      .leftJoin(
        interviewBookings,
        eq(interviewBookings.slotId, interviewSlots.id),
      )
      .leftJoin(
        applications,
        eq(applications.id, interviewBookings.applicationId),
      )
      .leftJoin(jobs, eq(jobs.id, interviewSlots.jobId))
      .where(whereClause as any) // allow undefined like your previous pattern
      .orderBy(desc(interviewSlots.startAt));

    return NextResponse.json({ slots: rows });
  } catch (err) {
    console.error("GET /api/interviews/slots error", err);
    return NextResponse.json(
      { error: "Failed to load interview slots" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      orgId,
      jobId,
      applicationId,
      startAt,
      endAt,
      locationType = "online",
      locationDetail,
      maxCandidates, // we’ll still force 1 for now
      notes,
    } = body || {};

    const orgIdInt = Number(orgId);
    const jobIdInt = jobId ? Number(jobId) : null;
    const applicationIdInt = Number(applicationId);

    if (!orgId || Number.isNaN(orgIdInt)) {
      return NextResponse.json(
        { error: "Valid orgId is required" },
        { status: 400 },
      );
    }

    // Per-candidate invite: application is required
    if (!applicationId || Number.isNaN(applicationIdInt)) {
      return NextResponse.json(
        { error: "applicationId is required for per-candidate slots" },
        { status: 400 },
      );
    }

    if (!startAt || !endAt) {
      return NextResponse.json(
        { error: "startAt and endAt are required" },
        { status: 400 },
      );
    }

    // Resolve createdByUserId from current authenticated user
    const sessionUser = await getCurrentUser(req);
    let createdByUserId: number | null = null;

    if (sessionUser?.email) {
      const appUser = await db
        .select()
        .from(users)
        .where(eq(users.email, sessionUser.email))
        .limit(1);

      if (appUser.length > 0) {
        createdByUserId = (appUser[0] as any).id as number;
      }
    }

    if (!createdByUserId) {
      return NextResponse.json(
        { error: "Could not resolve authenticated user for createdByUserId" },
        { status: 401 },
      );
    }

    // Load application to snapshot candidate info
    const [applicationRow] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationIdInt))
      .limit(1);

    if (!applicationRow) {
      return NextResponse.json(
        { error: "Application not found" },
        { status: 400 },
      );
    }

    // Optional sanity-check that this application belongs to the same job
    if (jobIdInt && applicationRow.jobId && applicationRow.jobId !== jobIdInt) {
      return NextResponse.json(
        { error: "Application does not belong to this job" },
        { status: 400 },
      );
    }

    const start = new Date(startAt);
    const end = new Date(endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return NextResponse.json(
        { error: "Invalid startAt or endAt" },
        { status: 400 },
      );
    }

    // 🔵 Step 1: Insert slot as an OPEN invite (awaiting candidate booking)
    const [insertedSlot] = await db
      .insert(interviewSlots)
      .values({
        orgId: orgIdInt,
        jobId: jobIdInt,
        createdByUserId,
        startAt: start,
        endAt: end,
        locationType,
        locationDetail: locationDetail ?? null,
        maxCandidates: 1, // per-candidate
        status: "open",    // <- key change: slot is open, not booked yet
        notes: notes ?? null,
      })
      .returning();

    // 🔵 Step 2: Create an INVITED booking for that specific application
    const [insertedBooking] = await db
      .insert(interviewBookings)
      .values({
        slotId: (insertedSlot as any).id,
        applicationId: applicationIdInt,
        applicantUserId: applicationRow.applicantUserId ?? null,
        applicantEmail: applicationRow.applicantEmail,
        status: "invited", // <- important: this is an invitation, not confirmed
        notes: null,
      })
      .returning();

    // Response enriched with candidate meta (for employer UI)
    return NextResponse.json(
      {
        slot: {
          ...insertedSlot,
          applicationId: insertedBooking.applicationId,
          candidateName: applicationRow.applicantName,
          candidateEmail: applicationRow.applicantEmail,
          candidateStage: applicationRow.stage,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("POST /api/interviews/slots error", err);
    return NextResponse.json(
      { error: "Failed to create interview slot" },
      { status: 500 },
    );
  }
}
