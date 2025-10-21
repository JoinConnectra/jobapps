import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = parseInt(id);

    if (isNaN(orgId)) {
      return NextResponse.json(
        { error: 'Invalid organization ID', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (org.length === 0) {
      return NextResponse.json(
        { error: 'Organization not found', code: 'ORG_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(org[0], { status: 200 });
  } catch (error) {
    console.error('GET /api/organizations/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = parseInt(id);
    const body = await request.json();

    if (isNaN(orgId)) {
      return NextResponse.json(
        { error: 'Invalid organization ID', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const updated = await db
      .update(organizations)
      .set({
        ...body,
        updatedAt: now,
      })
      .where(eq(organizations.id, orgId))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Organization not found', code: 'ORG_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(updated[0], { status: 200 });
  } catch (error) {
    console.error('PATCH /api/organizations/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
