import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { memberships } from '@/db/schema';
import { eq } from 'drizzle-orm';

const VALID_ROLES = ['admin', 'manager', 'recruiter', 'reviewer', 'read_only'] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        {
          error: 'Valid membership ID is required',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    const membershipId = parseInt(id);

    // Parse request body
    const body = await request.json();
    const { role } = body;

    // Validate role field
    if (!role) {
      return NextResponse.json(
        {
          error: 'Role is required',
          code: 'MISSING_REQUIRED_FIELD',
        },
        { status: 400 }
      );
    }

    // Validate role value
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        {
          error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`,
          code: 'INVALID_ROLE',
        },
        { status: 400 }
      );
    }

    // Check if membership exists
    const existingMembership = await db
      .select()
      .from(memberships)
      .where(eq(memberships.id, membershipId))
      .limit(1);

    if (existingMembership.length === 0) {
      return NextResponse.json(
        {
          error: 'Membership not found',
          code: 'MEMBERSHIP_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Update membership role
    const updatedMembership = await db
      .update(memberships)
      .set({
        role: role,
        updatedAt: new Date(),
      })
      .where(eq(memberships.id, membershipId))
      .returning();

    return NextResponse.json(updatedMembership[0], { status: 200 });
  } catch (error) {
    console.error('PATCH /api/memberships/[id] error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
        code: 'INTERNAL_SERVER_ERROR',
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

    // Validate ID parameter
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        {
          error: 'Valid membership ID is required',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    const membershipId = parseInt(id);

    // Check if membership exists
    const existingMembership = await db
      .select()
      .from(memberships)
      .where(eq(memberships.id, membershipId))
      .limit(1);

    if (existingMembership.length === 0) {
      return NextResponse.json(
        {
          error: 'Membership not found',
          code: 'MEMBERSHIP_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Delete membership
    const deletedMembership = await db
      .delete(memberships)
      .where(eq(memberships.id, membershipId))
      .returning();

    return NextResponse.json(
      {
        message: 'Membership deleted successfully',
        membership: deletedMembership[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('DELETE /api/memberships/[id] error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error: ' + (error as Error).message,
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}