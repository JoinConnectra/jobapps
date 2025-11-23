// src/app/api/events/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

// GET /api/events/:id
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const numericId = Number(id);

    if (!Number.isFinite(numericId)) {
      return NextResponse.json(
        { error: "Invalid event id" },
        { status: 400 }
      );
    }

    // Try event_aggregates first for richer stats
    const agg = await supabaseService
      .from("event_aggregates")
      .select("*")
      .eq("id", numericId)
      .single();

    if (!agg.error && agg.data) {
      return NextResponse.json(agg.data);
    }

    // Fallback: base events table
    const base = await supabaseService
      .from("events")
      .select("*")
      .eq("id", numericId)
      .single();

    if (base.error) {
      const status =
        base.error.code === "PGRST116" || base.error.details?.includes("Results contain 0 rows")
          ? 404
          : 500;
      return NextResponse.json(
        { error: base.error.message },
        { status }
      );
    }

    return NextResponse.json(base.data);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

// PATCH /api/events/:id
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const numericId = Number(id);

    if (!Number.isFinite(numericId)) {
      return NextResponse.json(
        { error: "Invalid event id" },
        { status: 400 }
      );
    }

    const patch = await req.json();

    const allowedKeys = [
      "title",
      "description",
      "location",
      "medium",
      "tags",
      "start_at",
      "end_at",
      "status",
      "featured",
      "is_employer_hosted",
      "org_id",
      "capacity",
      "registration_url",
    ] as const;

    const updatePayload: Record<string, any> = {};
    for (const key of allowedKeys) {
      if (key in patch) {
        updatePayload[key] = patch[key];
      }
    }

    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await supabaseService
      .from("events")
      .update(updatePayload)
      .eq("id", numericId)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

// DELETE /api/events/:id
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const numericId = Number(id);

    if (!Number.isFinite(numericId)) {
      return NextResponse.json(
        { error: "Invalid event id" },
        { status: 400 }
      );
    }

    const { error } = await supabaseService
      .from("events")
      .delete()
      .eq("id", numericId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
