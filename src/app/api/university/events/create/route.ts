import { NextRequest, NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

/**
 * POST /api/university/events/create
 * Body:
 * {
 *   orgId: number;
 *   title: string;
 *   description?: string | null;
 *   location?: string | null;
 *   medium?: "IN_PERSON" | "VIRTUAL";
 *   tags?: string[];
 *   capacity?: number | null;
 *   registrationUrl?: string | null;
 *   startsAt: string; // ISO
 *   endsAt?: string | null; // ISO
 * }
 *
 * Inserts into the shared `events` table with is_employer_hosted = false.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      orgId,
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

    if (!orgId || !title || !startsAt) {
      return NextResponse.json(
        { error: "orgId, title, startsAt are required" },
        { status: 400 }
      );
    }

    const normalizedTags: string[] = Array.isArray(tags)
      ? tags.map((t) => String(t).trim()).filter(Boolean)
      : [];

    const cap =
      typeof capacity === "number" && Number.isFinite(capacity)
        ? capacity
        : null;

    const insert = {
      org_id: Number(orgId),
      title: String(title),
      description: description ?? null,
      location: location ?? null,
      medium: medium === "VIRTUAL" ? "VIRTUAL" : "IN_PERSON",
      tags: normalizedTags,
      start_at: String(startsAt),
      end_at: endsAt ? String(endsAt) : null,
      featured: false,
      is_employer_hosted: false, // university-owned
      status: "published", // or "draft" if you introduce a review flow
      capacity: cap,
      registration_url: registrationUrl ?? null,
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
  } catch (e) {
    console.error("POST /api/university/events/create error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
