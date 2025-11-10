import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';

// GET /api/events
export async function GET(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get('orgId');
    const status = req.nextUrl.searchParams.get('status');
    const q = (req.nextUrl.searchParams.get('q') || '').toLowerCase();

    let query = supabaseService
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

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();

    const body = {
      org_id: Number(b.org_id),
      title: String(b.title ?? ''),
      description: b.description ?? null,
      location: b.location ?? null,
      medium: b.medium ?? 'IN_PERSON',
      tags: Array.isArray(b.tags) ? b.tags : [],
      start_at: b.start_at,
      end_at: b.end_at ?? null,
      featured: Boolean(b.featured),
      is_employer_hosted: b.is_employer_hosted ?? true,
      status: b.status ?? 'draft',
    };

    const { data, error } = await supabaseService
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
