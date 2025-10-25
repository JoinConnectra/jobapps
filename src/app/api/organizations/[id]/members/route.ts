import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { memberships, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const orgId = parseInt(params.id);
    
    if (isNaN(orgId)) {
      return NextResponse.json(
        { error: 'Invalid organization ID' },
        { status: 400 }
      );
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
  { params }: { params: { id: string } }
) {
  try {
    const orgId = parseInt(params.id);
    
    if (isNaN(orgId)) {
      return NextResponse.json(
        { error: 'Invalid organization ID' },
        { status: 400 }
      );
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