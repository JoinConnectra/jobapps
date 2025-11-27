// /src/app/api/interviews/book/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { applications, interviewBookings, interviewSlots } from "@/db/schema-pg";
import { and, eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      slotId,
      applicationId,
      applicantUserId,
      applicantEmail,
      notes,
    } = body || {};

    if (!slotId || !applicationId) {
      return NextResponse.json(
        { error: "slotId and applicationId are required" },
        { status: 400 },
      );
    }

    const result = await db.transaction(async (tx) => {
      const slotIdInt = Number(slotId);
      const appIdInt = Number(applicationId);

      const [slot] = await tx
        .select()
        .from(interviewSlots)
        .where(eq(interviewSlots.id, slotIdInt))
        .limit(1);

      if (!slot) {
        throw new Error("Slot not found");
      }
      if (slot.status !== "open") {
        throw new Error("Slot is not open for booking");
      }

      const [app] = await tx
        .select()
        .from(applications)
        .where(eq(applications.id, appIdInt))
        .limit(1);

      if (!app) {
        throw new Error("Application not found");
      }

      // 🔵 find the invited booking that was created when employer made the slot
      const [existingBooking] = await tx
        .select()
        .from(interviewBookings)
        .where(
          and(
            eq(interviewBookings.slotId, slotIdInt),
            eq(interviewBookings.applicationId, appIdInt),
          ),
        )
        .limit(1);

      if (!existingBooking) {
        throw new Error("Invitation not found for this slot/application");
      }

      // 🔵 update that booking to "booked"
      const [updatedBooking] = await tx
        .update(interviewBookings)
        .set({
          status: "booked",
          applicantUserId: applicantUserId ?? app.applicantUserId ?? null,
          applicantEmail: applicantEmail ?? app.applicantEmail,
          notes: notes ?? existingBooking.notes,
        })
        .where(eq(interviewBookings.id, existingBooking.id))
        .returning();

      await tx
        .update(interviewSlots)
        .set({ status: "booked" })
        .where(eq(interviewSlots.id, slotIdInt));

      return updatedBooking;
    });

    return NextResponse.json({ booking: result }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/interviews/book error", err);
    const msg = err?.message || "Failed to book interview slot";
    const status = msg.includes("not found") || msg.includes("not open")
      ? 400
      : 500;

    return NextResponse.json({ error: msg }, { status });
  }
}
