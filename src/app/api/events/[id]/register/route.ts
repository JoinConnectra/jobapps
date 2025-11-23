import { NextRequest, NextResponse } from 'next/server';
import { supabaseService } from '@/lib/supabase';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = Number(params.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: 'Invalid event id' }, { status: 400 });
    }

    const { userEmail } = await req.json();
    if (!userEmail) {
      return NextResponse.json({ error: 'userEmail is required' }, { status: 400 });
    }

    // Create registration
    const { data, error } = await supabaseService
      .from('event_registrations')
      .insert({ event_id: id, user_email: userEmail })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Best-effort bump attendees_count via RPC
    const { error: incErr } = await supabaseService.rpc('increment_attendees', {
      p_event_id: id,
    });
    if (incErr) {
      console.warn('increment_attendees failed:', incErr.message);
    }

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 });
  }
}
