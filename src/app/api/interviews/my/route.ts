// /src/app/api/interviews/my/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  interviewBookings,
  interviewSlots,
  jobs,
  organizations,
  users,
} from "@/db/schema-pg";
import { and, eq, or, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    // ✅ Use session to resolve the current user
    const sessionUser = await getCurrentUser(req);
    if (!sessionUser?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [dbUser] = await db
      .select({
        id: users.id,
        email: users.email,
      })
      .from(users)
      .where(eq(users.email, sessionUser.email))
      .limit(1);

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // ✅ Fetch all bookings for this user:
    //  - either matching applicantUserId
    //  - or legacy bookings where applicantUserId is null but email matches
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
        // 🔵 needed to call /api/interviews/book
        applicationId: interviewBookings.applicationId,
        applicantEmail: interviewBookings.applicantEmail,
      })
      .from(interviewBookings)
      .innerJoin(
        interviewSlots,
        eq(interviewBookings.slotId, interviewSlots.id),
      )
      .leftJoin(jobs, eq(interviewSlots.jobId, jobs.id))
      .leftJoin(organizations, eq(interviewSlots.orgId, organizations.id))
      .where(
        or(
          eq(interviewBookings.applicantUserId, dbUser.id),
          and(
            isNull(interviewBookings.applicantUserId),
            eq(interviewBookings.applicantEmail, dbUser.email),
          ),
        ),
      );

    return NextResponse.json({ interviews: rows });
  } catch (err) {
    console.error("GET /api/interviews/my error", err);
    return NextResponse.json(
      { error: "Failed to load interviews" },
      { status: 500 },
    );
  }
}
