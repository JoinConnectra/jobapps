import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: 'Valid ID is required',
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    // Get organization by ID
    const organization = await db.select()
      .from(organizations)
      .where(eq(organizations.id, parseInt(id)))
      .limit(1);

    if (organization.length === 0) {
      return NextResponse.json(
        { 
          error: 'Organization not found',
          code: 'NOT_FOUND'
        },
        { status: 404 }
      );
    }

    return NextResponse.json(organization[0], { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: 'Valid ID is required',
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    // Check if organization exists
    const existing = await db.select()
      .from(organizations)
      .where(eq(organizations.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { 
          error: 'Organization not found',
          code: 'NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, slug, type, plan, seatLimit } = body;

    // Validate type if provided
    if (type !== undefined && type !== 'company' && type !== 'university') {
      return NextResponse.json(
        { 
          error: 'Type must be either "company" or "university"',
          code: 'INVALID_TYPE'
        },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (name !== undefined) updates.name = name.trim();
    if (slug !== undefined) updates.slug = slug.trim();
    if (type !== undefined) updates.type = type;
    if (plan !== undefined) updates.plan = plan;
    if (seatLimit !== undefined) updates.seatLimit = seatLimit;

    // Update organization
    const updated = await db.update(organizations)
      .set(updates)
      .where(eq(organizations.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json(
        { 
          error: 'Failed to update organization',
          code: 'UPDATE_FAILED'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(updated[0], { status: 200 });

  } catch (error) {
    console.error('PUT error:', error);

    // Handle unique constraint violation for slug
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { 
          error: 'An organization with this slug already exists',
          code: 'DUPLICATE_SLUG'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { 
          error: 'Valid ID is required',
          code: 'INVALID_ID'
        },
        { status: 400 }
      );
    }

    // Check if organization exists
    const existing = await db.select()
      .from(organizations)
      .where(eq(organizations.id, parseInt(id)))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { 
          error: 'Organization not found',
          code: 'NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Delete organization
    const deleted = await db.delete(organizations)
      .where(eq(organizations.id, parseInt(id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json(
        { 
          error: 'Failed to delete organization',
          code: 'DELETE_FAILED'
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Organization deleted successfully',
        organization: deleted[0]
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error))
      },
      { status: 500 }
    );
  }
}