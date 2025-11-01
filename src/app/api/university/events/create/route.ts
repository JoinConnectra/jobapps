import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/university/events/create
 * Body: { orgId, title, description?, location?, startsAt, endsAt? }
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

    const { data, error } = await supabaseAdmin
      .from("university_events")
      .insert({
        university_org_id: Number(orgId),
        title,
        description: description || null,
        location: location || null,
        starts_at: startsAt,
        ends_at: endsAt || null,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
