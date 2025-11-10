import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

/**
 * POST /api/university/events/create
 * Body: { orgId, title, description?, location?, startsAt, endsAt? }
 * Inserts into the shared `events` table with is_employer_hosted = false
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orgId, title, description, location, startsAt, endsAt } = body || {};

    if (!orgId || !title || !startsAt) {
      return NextResponse.json(
        { error: "orgId, title, startsAt are required" },
        { status: 400 }
      );
    }

    const insert = {
      org_id: Number(orgId),
      title: String(title),
      description: description ?? null,
      location: location ?? null,
      medium: "IN_PERSON",
      tags: [],
      start_at: String(startsAt),
      end_at: endsAt ? String(endsAt) : null,
      featured: false,
      is_employer_hosted: false, // university-owned
      status: "published",       // or "draft" for a review flow
    };

    const { data, error } = await supabaseService
      .from("events")
      .insert(insert)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
