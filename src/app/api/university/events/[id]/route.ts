import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

type RouteParams = { params: { id: string } };

// GET /api/university/events/[id]
// Return a single event (from event_aggregates so we get attendees, capacity, etc.)
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const eventId = Number(params.id);
    if (!Number.isFinite(eventId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const { data, error } = await supabaseService
      .from("event_aggregates")
      .select("*")
      .eq("id", eventId)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error("GET /api/university/events/[id] error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/university/events/[id]
// Update the underlying `events` row for a university-owned event
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const eventId = Number(params.id);
    if (!Number.isFinite(eventId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();

    const {
      title,
      description,
      location,
      medium,
      tags,
      capacity,
      registrationUrl,
      startsAt,
      endsAt,
    } = body || {};

    if (!title || !startsAt) {
      return NextResponse.json(
        { error: "title and startsAt are required" },
        { status: 400 }
      );
    }

    const normalizedTags: string[] = Array.isArray(tags)
      ? tags.map((t: any) => String(t).trim()).filter(Boolean)
      : [];

    const cap =
      typeof capacity === "number" && Number.isFinite(capacity)
        ? capacity
        : null;

    const update: Record<string, any> = {
      title: String(title),
      description: description ?? null,
      location: location ?? null,
      medium: medium === "VIRTUAL" ? "VIRTUAL" : "IN_PERSON",
      tags: normalizedTags,
      start_at: String(startsAt),
      end_at: endsAt ? String(endsAt) : null,
      capacity: cap,
      registration_url: registrationUrl ?? null,
    };

    const { data, error } = await supabaseService
      .from("events")
      .update(update)
      .eq("id", eventId)
      .eq("is_employer_hosted", false) // safety: only uni-owned
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e) {
    console.error("PATCH /api/university/events/[id] error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/university/events/[id]
// Delete the underlying `events` row for a university-owned event
export async function DELETE(
  _req: NextRequest,
  { params }: RouteParams
) {
  try {
    const eventId = Number(params.id);
    if (!Number.isFinite(eventId)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const { error } = await supabaseService
      .from("events")
      .delete()
      .eq("id", eventId)
      .eq("is_employer_hosted", false); // safety: only university-owned events

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/university/events/[id] error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
