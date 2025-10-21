import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { memberships, organizations, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

const VALID_ROLES = ['admin', 'manager', 'recruiter', 'reviewer', 'read_only'] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orgId = params.id;

    // Validate organization ID
    if (!orgId || isNaN(parseInt(orgId))) {
      return NextResponse.json(
        { error: 'Valid organization ID is required', code: 'INVALID_ORG_ID' },
        { status: 400 }
      );
    }

    // Check if organization exists
    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, parseInt(orgId)))
      .limit(1);

    if (org.length === 0) {
      return NextResponse.json(
        { error: 'Organization not found', code: 'ORG_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Get all memberships with user details
    const membersList = await db
      .select({
        id: memberships.id,
        userId: memberships.userId,
        orgId: memberships.orgId,
        role: memberships.role,
        createdAt: memberships.createdAt,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
          phone: users.phone,
          locale: users.locale,
          avatarUrl: users.avatarUrl,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        },
      })
      .from(memberships)
      .innerJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.orgId, parseInt(orgId)));

    return NextResponse.json(membersList, { status: 200 });
  } catch (error) {
    console.error('GET /api/organizations/[id]/members error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orgId = params.id;

    // Validate organization ID
    if (!orgId || isNaN(parseInt(orgId))) {
      return NextResponse.json(
        { error: 'Valid organization ID is required', code: 'INVALID_ORG_ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { userId, role } = body;

    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required', code: 'MISSING_USER_ID' },
        { status: 400 }
      );
    }

    if (!role) {
      return NextResponse.json(
        { error: 'role is required', code: 'MISSING_ROLE' },
        { status: 400 }
      );
    }

    // Validate userId is a valid integer
    if (isNaN(parseInt(String(userId)))) {
      return NextResponse.json(
        { error: 'userId must be a valid integer', code: 'INVALID_USER_ID' },
        { status: 400 }
      );
    }

    // Validate role
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json(
        {
          error: `role must be one of: ${VALID_ROLES.join(', ')}`,
          code: 'INVALID_ROLE',
        },
        { status: 400 }
      );
    }

    // Check if organization exists
    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, parseInt(orgId)))
      .limit(1);

    if (org.length === 0) {
      return NextResponse.json(
        { error: 'Organization not found', code: 'ORG_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, parseInt(String(userId))))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json(
        { error: 'User not found', code: 'USER_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Check if membership already exists
    const existingMembership = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.userId, parseInt(String(userId))),
          eq(memberships.orgId, parseInt(orgId))
        )
      )
      .limit(1);

    if (existingMembership.length > 0) {
      return NextResponse.json(
        {
          error: 'User is already a member of this organization',
          code: 'MEMBERSHIP_EXISTS',
        },
        { status: 409 }
      );
    }

    // Create new membership
    const newMembership = await db
      .insert(memberships)
      .values({
        userId: parseInt(String(userId)),
        orgId: parseInt(orgId),
        role: role,
        createdAt: new Date().toISOString(),
      })
      .returning();

    return NextResponse.json(newMembership[0], { status: 201 });
  } catch (error) {
    console.error('POST /api/organizations/[id]/members error:', error);
    
    // Handle unique constraint violation
    if ((error as Error).message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        {
          error: 'User is already a member of this organization',
          code: 'MEMBERSHIP_EXISTS',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}