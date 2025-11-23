import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

/**
 * GET /api/university/events?orgId=123&status=upcoming|past|all&q=...
 * Reads from `event_aggregates` so we get reg_count/checkins_count/capacity/etc.
 */
export async function GET(request: NextRequest) {
  try {
    const orgIdParam = request.nextUrl.searchParams.get("orgId");
    const orgId = orgIdParam ? Number(orgIdParam) : null;

    const q = (request.nextUrl.searchParams.get("q") || "").toLowerCase();
    const status = (request.nextUrl.searchParams.get("status") || "all") as
      | "upcoming"
      | "past"
      | "all";

    // 1) Employer-hosted, published (global feed) from event_aggregates
    const { data: employerRows, error: employerErr } = await supabaseService
      .from("event_aggregates")
      .select("*")
      .eq("is_employer_hosted", true)
      .eq("status", "published");

    if (employerErr) {
      return NextResponse.json({ error: employerErr.message }, { status: 500 });
    }

    // 2) This university’s own events (same underlying events, but uni-hosted)
    let uniRows: any[] = [];
    if (orgId) {
      const { data, error } = await supabaseService
        .from("event_aggregates")
        .select("*")
        .eq("is_employer_hosted", false)
        .eq("org_id", orgId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      uniRows = data || [];
    }

    type Host = "EMPLOYER" | "UNIVERSITY";

    const mapRow = (e: any, host: Host) => ({
      id: e.id,
      title: e.title,
      description: e.description ?? null,
      location: e.location ?? null,
      startsAt: e.start_at,
      endsAt: e.end_at ?? null,
      medium: e.medium ?? null,
      tags: e.tags ?? [],
      categories: null, // event_aggregates doesn’t have categories; can be enriched later
      featured: !!e.featured,
      status: e.status ?? null,
      is_employer_hosted: !!e.is_employer_hosted,

      // aggregate metrics
      reg_count: e.reg_count ?? null,
      checkins_count: e.checkins_count ?? null,
      attendees_count: e.attendees_count ?? null,

      // capacity & external registration
      capacity: e.capacity ?? null,
      registration_url: e.registration_url ?? null,

      _host: host,
    });

    let merged = [
      ...(employerRows || []).map((e) => mapRow(e, "EMPLOYER")),
      ...uniRows.map((e) => mapRow(e, "UNIVERSITY")),
    ];

    // status filter (upcoming vs past vs all)
    if (status !== "all") {
      const now = new Date();
      merged =
        status === "upcoming"
          ? merged.filter((r) => new Date(r.startsAt) >= now)
          : merged.filter((r) => new Date(r.startsAt) < now);
    }

    // free-text search
    if (q) {
      const match = (s?: string | null) => (s || "").toLowerCase().includes(q);
      merged = merged.filter((r) => {
        const tagStr = Array.isArray(r.tags) ? r.tags.join(" ").toLowerCase() : "";
        return (
          match(r.title) ||
          match(r.description) ||
          match(r.location) ||
          tagStr.includes(q)
        );
      });
    }

    // sort by start time (soonest first)
    merged.sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    );

    return NextResponse.json(merged);
  } catch (e) {
    console.error("GET /api/university/events error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
