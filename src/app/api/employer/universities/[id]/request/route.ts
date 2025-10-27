import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { universityAuthorizations } from '@/db/schema-pg';
import { and, eq } from 'drizzle-orm';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const universityOrgId = parseInt(id);
    if (Number.isNaN(universityOrgId)) return NextResponse.json({ error: 'Invalid university id' }, { status: 400 });
    
    const body = await request.json();
    const { companyOrgId } = body as { companyOrgId?: number };
    if (!companyOrgId) return NextResponse.json({ error: 'companyOrgId required' }, { status: 400 });

    // If exists, do nothing
    const existing = await db
      .select()
      .from(universityAuthorizations)
      .where(and(eq(universityAuthorizations.companyOrgId, companyOrgId), eq(universityAuthorizations.universityOrgId, universityOrgId)))
      .limit(1);
    
    if (existing.length > 0) return NextResponse.json({ ok: true, id: existing[0].id });

    const now = new Date();
    const inserted = await db.insert(universityAuthorizations).values({
      companyOrgId,
      universityOrgId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    }).returning();
    return NextResponse.json(inserted[0], { status: 201 });
  } catch (e) {
    console.error('POST employer request university error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


