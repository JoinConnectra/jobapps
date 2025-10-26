import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { universityEvents } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const orgIdParam = request.nextUrl.searchParams.get('orgId');
    if (!orgIdParam) return NextResponse.json({ error: 'orgId required' }, { status: 400 });
    const orgId = parseInt(orgIdParam);
    const rows = await db.select().from(universityEvents).where(eq(universityEvents.universityOrgId, orgId));
    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET university events error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { universityOrgId, title, description, location, startsAt, endsAt } = body;
    if (!universityOrgId || !title || !startsAt) return NextResponse.json({ error: 'missing fields' }, { status: 400 });
    const now = new Date();
    const inserted = await db.insert(universityEvents).values({
      universityOrgId,
      title,
      description: description || null,
      location: location || null,
      startsAt: new Date(startsAt),
      endsAt: endsAt ? new Date(endsAt) : null,
      createdAt: now,
      updatedAt: now,
    }).returning();
    return NextResponse.json(inserted[0], { status: 201 });
  } catch (e) {
    console.error('POST university events error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


