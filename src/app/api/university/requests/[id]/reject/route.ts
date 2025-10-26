import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { universityAuthorizations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const reqId = parseInt(id);
    if (Number.isNaN(reqId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    const now = new Date();
    await db.update(universityAuthorizations).set({ status: 'rejected', updatedAt: now }).where(eq(universityAuthorizations.id, reqId));
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST reject error', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


