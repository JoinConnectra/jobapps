import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { universityEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const eventId = parseInt(id);
    if (Number.isNaN(eventId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    await db.delete(universityEvents).where(eq(universityEvents.id, eventId));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE university event error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


