import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, type, plan, seatLimit } = body;

    if (!name || !slug || !type) {
      return NextResponse.json(
        { error: 'Name, slug, and type are required', code: 'MISSING_FIELDS' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existing = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug.trim()))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Slug already exists', code: 'SLUG_EXISTS' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const newOrg = await db
      .insert(organizations)
      .values({
        name: name.trim(),
        slug: slug.trim(),
        type: type.trim(),
        plan: plan?.trim() || null,
        seatLimit: seatLimit || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return NextResponse.json(newOrg[0], { status: 201 });
  } catch (error) {
    console.error('POST /api/organizations error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');

    if (id) {
      const orgId = parseInt(id);
      if (isNaN(orgId)) {
        return NextResponse.json(
          { error: 'Invalid ID', code: 'INVALID_ID' },
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
    }

    if (slug) {
      const org = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, slug.trim()))
        .limit(1);

      if (org.length === 0) {
        return NextResponse.json(
          { error: 'Organization not found', code: 'ORG_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(org[0], { status: 200 });
    }

    // List all organizations
    const orgs = await db.select().from(organizations);
    return NextResponse.json(orgs, { status: 200 });
  } catch (error) {
    console.error('GET /api/organizations error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
