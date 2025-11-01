import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/university/events?orgId=123&status=upcoming|past|all&q=...
 *
 * Returns a merged feed:
 *  1) ALL employer-hosted events from `events` where status='published'  (global feed, like student portal)
 *  2) This university's own events from `university_events` (if orgId supplied)
 *
 * Notes:
 *  - orgId is OPTIONAL for GET. If missing, we just return (1).
 *  - POST still requires orgId to create a university event.
 */
export async function GET(request: NextRequest) {
  try {
    const orgIdParam = request.nextUrl.searchParams.get('orgId'); // optional for GET
    const orgId = orgIdParam ? Number(orgIdParam) : null;

    const q = (request.nextUrl.searchParams.get('q') || '').toLowerCase();
    const status = (request.nextUrl.searchParams.get('status') || 'all') as
      | 'upcoming'
      | 'past'
      | 'all';

    // -----------------------------
    // 1) ALL employer-hosted events (global like student portal)
    // -----------------------------
    // We only include employer events that are "published".
    // You can add extra filters (date window, medium, tags) later if needed.
    const { data: employerRows, error: employerErr } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('status', 'published');

    if (employerErr) {
      return NextResponse.json({ error: employerErr.message }, { status: 500 });
    }

    const employerEvents = (employerRows || []).map((e: any) => ({
      id: e.id,
      title: e.title,
      description: e.description ?? null,
      location: e.location ?? null,
      startsAt: e.start_at, // ISO string
      endsAt: e.end_at ?? null,
      medium: e.medium ?? null,
      tags: e.tags ?? null,
      categories: e.categories ?? null,
      featured: e.featured ?? false,
      status: e.status ?? null,
      is_employer_hosted: e.is_employer_hosted ?? true,
      _host: 'EMPLOYER' as const,
    }));

    // -----------------------------
    // 2) This university's own events (only if orgId provided)
    // -----------------------------
    let universityEvents: any[] = [];
    if (orgId) {
      const { data: uniRows, error: uniErr } = await supabaseAdmin
        .from('university_events')
        .select('*')
        .eq('university_org_id', orgId);

      if (uniErr) {
        return NextResponse.json({ error: uniErr.message }, { status: 500 });
      }

      universityEvents = (uniRows || []).map((u: any) => ({
        id: u.id,
        title: u.title,
        description: u.description ?? null,
        location: u.location ?? null,
        startsAt: u.starts_at, // ISO string
        endsAt: u.ends_at ?? null,
        medium: null,
        tags: null,
        categories: null,
        featured: false,
        status: 'published', // treat university items as visible in the feed
        is_employer_hosted: false,
        _host: 'UNIVERSITY' as const,
      }));
    }

    // -----------------------------
    // Merge + filter + sort
    // -----------------------------
    let merged = [...employerEvents, ...universityEvents];

    // status filter
    if (status !== 'all') {
      const now = new Date();
      if (status === 'upcoming') {
        merged = merged.filter((r) => new Date(r.startsAt) >= now);
      } else if (status === 'past') {
        merged = merged.filter((r) => new Date(r.startsAt) < now);
      }
    }

    // text search (title/description/location)
    if (q) {
      const like = (s?: string | null) => (s || '').toLowerCase().includes(q);
      merged = merged.filter(
        (r) => like(r.title) || like(r.description) || like(r.location),
      );
    }

    // sort ascending by start time
    merged.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

    return NextResponse.json(merged);
  } catch (e: any) {
    console.error('GET /api/university/events error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/university/events
 * Body: { orgId, title, description?, location?, startsAt, endsAt? }
 * Creates a UNIVERSITY-hosted event in `university_events`.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { orgId, title, description, location, startsAt, endsAt } = body || {};

    if (!orgId || !title || !startsAt) {
      return NextResponse.json(
        { error: 'orgId, title, startsAt are required' },
        { status: 400 },
      );
    }

    const { data, error } = await supabaseAdmin
      .from('university_events')
      .insert({
        university_org_id: Number(orgId),
        title,
        description: description || null,
        location: location || null,
        starts_at: startsAt,
        ends_at: endsAt || null,
      })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    console.error('POST /api/university/events error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
