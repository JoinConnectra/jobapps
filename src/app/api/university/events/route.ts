import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

/**
 * GET /api/university/events?orgId=123&status=upcoming|past|all&q=...
 * Reads from the single `events` table.
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

    // 1) employer-hosted, published (global feed)
    const { data: employerRows, error: employerErr } = await supabaseService
      .from("events")
      .select("*")
      .eq("is_employer_hosted", true)
      .eq("status", "published");

    if (employerErr) {
      return NextResponse.json({ error: employerErr.message }, { status: 500 });
    }

    // 2) this university’s own events (same table), optional
    let uniRows: any[] = [];
    if (orgId) {
      const { data, error } = await supabaseService
        .from("events")
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
      tags: e.tags ?? null,
      categories: e.categories ?? null,
      featured: !!e.featured,
      status: e.status ?? null,
      is_employer_hosted: !!e.is_employer_hosted,
      _host: host,
    });

    let merged = [
      ...(employerRows || []).map((e) => mapRow(e, "EMPLOYER")),
      ...uniRows.map((e) => mapRow(e, "UNIVERSITY")),
    ];

    // status filter
    if (status !== "all") {
      const now = new Date();
      merged =
        status === "upcoming"
          ? merged.filter((r) => new Date(r.startsAt) >= now)
          : merged.filter((r) => new Date(r.startsAt) < now);
    }

    // q filter
    if (q) {
      const match = (s?: string | null) => (s || "").toLowerCase().includes(q);
      merged = merged.filter(
        (r) => match(r.title) || match(r.description) || match(r.location)
      );
    }

    // sort by start time
    merged.sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    );

    return NextResponse.json(merged);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
