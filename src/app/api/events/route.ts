// src/app/api/events/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

// GET /api/events?orgId=...&status=...
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const orgIdParam = url.searchParams.get("orgId");
    const statusParam = url.searchParams.get("status");

    // Prefer the aggregates view so the dashboard can see stats
    let query = supabaseService
      .from("event_aggregates")
      .select("*")
      .order("start_at", { ascending: true });

    if (orgIdParam) {
      const orgId = Number(orgIdParam);
      if (!Number.isFinite(orgId)) {
        return NextResponse.json(
          { error: "Invalid orgId" },
          { status: 400 }
        );
      }
      query = query.eq("org_id", orgId);
    }

    if (statusParam && statusParam !== "all") {
      query = query.eq("status", statusParam);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}

// POST /api/events
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const orgId = body.org_id;
    const title = body.title;
    const start_at = body.start_at;

    if (!orgId || !Number.isFinite(Number(orgId))) {
      return NextResponse.json(
        { error: "org_id is required and must be a number" },
        { status: 400 }
      );
    }
    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }
    if (!start_at || typeof start_at !== "string") {
      return NextResponse.json(
        { error: "start_at is required" },
        { status: 400 }
      );
    }

    // Only allow known columns to go through
    const payload: Record<string, any> = {
      org_id: Number(orgId),
      title: title.trim(),
      description:
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : null,
      location:
        typeof body.location === "string" && body.location.trim()
          ? body.location.trim()
          : null,
      medium: body.medium || "IN_PERSON",
      tags: Array.isArray(body.tags) ? body.tags : [],
      start_at,
      end_at: body.end_at ?? null,
      featured: !!body.featured,
      is_employer_hosted:
        typeof body.is_employer_hosted === "boolean"
          ? body.is_employer_hosted
          : true,
      status: body.status || "draft",
      attendees_count: 0,
      capacity:
        typeof body.capacity === "number"
          ? body.capacity
          : body.capacity == null
          ? null
          : Number(body.capacity) || null,
      registration_url:
        typeof body.registration_url === "string" &&
        body.registration_url.trim()
          ? body.registration_url.trim()
          : null,
    };

    const { data, error } = await supabaseService
      .from("events")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { error: e?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
