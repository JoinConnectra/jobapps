import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { memberships, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = parseInt(id);
    
    if (isNaN(orgId)) {
      return NextResponse.json(
        { error: 'Invalid organization ID' },
        { status: 400 }
      );
    }

    // Check if user is authenticated and is a member of this organization
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user from our database
    const currentUser = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (currentUser.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is a member of this organization
    const userMembership = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.orgId, orgId),
          eq(memberships.userId, currentUser[0].id)
        )
      )
      .limit(1);

    if (userMembership.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const members = await db
      .select({
        id: memberships.id,
        userId: memberships.userId,
        userName: users.name,
        userEmail: users.email,
        role: memberships.role,
        status: memberships.status,
        createdAt: memberships.createdAt,
      })
      .from(memberships)
      .leftJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.orgId, orgId));

    return NextResponse.json(members);
  } catch (error) {
    console.error('GET /api/organizations/[id]/members error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orgId = parseInt(id);
    
    if (isNaN(orgId)) {
      return NextResponse.json(
        { error: 'Invalid organization ID' },
        { status: 400 }
      );
    }

    // Check if user is authenticated and is an admin of this organization
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the current user from our database
    const currentUser = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (currentUser.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is an admin of this organization
    const userMembership = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.orgId, orgId),
          eq(memberships.userId, currentUser[0].id),
          eq(memberships.role, 'admin')
        )
      )
      .limit(1);

    if (userMembership.length === 0) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, role = 'member' } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const existingMembership = await db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.orgId, orgId),
          eq(memberships.userId, userId)
        )
      )
      .limit(1);

    if (existingMembership.length > 0) {
      return NextResponse.json(
        { error: 'User is already a member of this organization' },
        { status: 400 }
      );
    }

    const newMembership = await db
      .insert(memberships)
      .values({
        orgId,
        userId,
        role,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return NextResponse.json(newMembership[0], { status: 201 });
  } catch (error) {
    console.error('POST /api/organizations/[id]/members error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}