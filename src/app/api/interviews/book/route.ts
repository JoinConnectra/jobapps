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

    // simple transactional guard: only book if slot exists + is open
    const result = await db.transaction(async (tx) => {
      const [slot] = await tx
        .select()
        .from(interviewSlots)
        .where(eq(interviewSlots.id, Number(slotId)))
        .limit(1);

      if (!slot) {
        throw new Error("Slot not found");
      }
      if (slot.status !== "open") {
        throw new Error("Slot is not open for booking");
      }

      // optional: validate application exists
      const [app] = await tx
        .select()
        .from(applications)
        .where(eq(applications.id, Number(applicationId)))
        .limit(1);

      if (!app) {
        throw new Error("Application not found");
      }

      const [booking] = await tx
        .insert(interviewBookings)
        .values({
          slotId: slot.id,
          applicationId: app.id,
          applicantUserId: applicantUserId ?? app.applicantUserId ?? null,
          applicantEmail: applicantEmail ?? app.applicantEmail,
          notes: notes ?? null,
        })
        .returning();

      // For MVP, mark slot as 'booked' once one booking is made
      await tx
        .update(interviewSlots)
        .set({ status: "booked" })
        .where(eq(interviewSlots.id, slot.id));

      return booking;
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
