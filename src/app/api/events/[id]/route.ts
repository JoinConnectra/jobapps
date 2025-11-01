import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: 'Invalid event id' }, { status: 400 });
  }

  // Try event_aggregates first, then fall back to events
  const agg = await supabaseAdmin
    .from('event_aggregates')
    .select('*')
    .eq('id', id)
    .single();

  if (!agg.error && agg.data) {
    return NextResponse.json(agg.data);
  }

  // Fallback if the view doesn't exist
  const base = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (base.error) {
    return NextResponse.json({ error: base.error.message }, { status: 500 });
  }
  return NextResponse.json(base.data);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid event id' }, { status: 400 });
    }

    const patch = await req.json();

    const { data, error } = await supabaseAdmin
      .from('events')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid event id' }, { status: 400 });
    }

    const { error } = await supabaseAdmin.from('events').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
