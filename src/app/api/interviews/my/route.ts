import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  applications,
  interviewBookings,
  interviewSlots,
  jobs,
  organizations,
} from "@/db/schema-pg";
import { and, eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const applicantUserIdParam = searchParams.get("applicantUserId");

  if (!applicantUserIdParam) {
    // TODO: replace with session-based user id
    return NextResponse.json(
      { error: "applicantUserId is required for now" },
      { status: 400 },
    );
  }

  const applicantUserId = Number(applicantUserIdParam);

  try {
    const rows = await db
      .select({
        bookingId: interviewBookings.id,
        slotId: interviewSlots.id,
        startAt: interviewSlots.startAt,
        endAt: interviewSlots.endAt,
        status: interviewBookings.status,
        locationType: interviewSlots.locationType,
        locationDetail: interviewSlots.locationDetail,
        orgName: organizations.name,
        jobTitle: jobs.title,
      })
      .from(interviewBookings)
      .innerJoin(
        interviewSlots,
        eq(interviewBookings.slotId, interviewSlots.id),
      )
      .leftJoin(jobs, eq(interviewSlots.jobId, jobs.id))
      .leftJoin(organizations, eq(interviewSlots.orgId, organizations.id))
      .where(eq(interviewBookings.applicantUserId, applicantUserId));

    return NextResponse.json({ interviews: rows });
  } catch (err) {
    console.error("GET /api/interviews/my error", err);
    return NextResponse.json(
      { error: "Failed to load interviews" },
      { status: 500 },
    );
  }
}
