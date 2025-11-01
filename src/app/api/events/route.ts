import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET /api/events
// Optional query params: orgId, status ('draft'|'published'|'past'|'all'), q (search term)
export async function GET(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get('orgId');
    const status = req.nextUrl.searchParams.get('status'); // 'draft' | 'published' | 'past' | 'all'
    const q = (req.nextUrl.searchParams.get('q') || '').toLowerCase();

    let query = supabaseAdmin
      .from('event_aggregates')
      .select('*')
      .order('start_at', { ascending: true });

    if (orgId) query = query.eq('org_id', Number(orgId));
    if (status && status !== 'all') query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const filtered = (data || []).filter((e: any) => {
      if (!q) return true;
      const hay = `${e.title} ${e.location ?? ''} ${(e.tags || []).join(' ')} ${(e.categories || []).join(' ')}`.toLowerCase();
      return hay.includes(q);
    });

    return NextResponse.json(filtered, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/events
// Body: { org_id,title,description,location,medium,tags,start_at,end_at,featured,is_employer_hosted,status }
export async function POST(req: NextRequest) {
  try {
    const b = await req.json();

    // ✅ Whitelist only columns that exist in your Supabase `events` table
    const body = {
      org_id: Number(b.org_id),
      title: String(b.title ?? ''),
      description: b.description ?? null,
      location: b.location ?? null,
      medium: b.medium ?? 'IN_PERSON',
      tags: Array.isArray(b.tags) ? b.tags : [],
      start_at: b.start_at,                  // expect ISO string
      end_at: b.end_at ?? null,              // ISO or null
      featured: Boolean(b.featured),
      is_employer_hosted: b.is_employer_hosted ?? true,
      status: b.status ?? 'draft',
      // ⛔️ Do NOT pass `created_by` or `categories` unless you add those columns in DB
    };

    const { data, error } = await supabaseAdmin
      .from('events')
      .insert(body)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
