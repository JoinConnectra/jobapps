import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { memberships } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const orgId = parseInt(params.id);
    const memberId = parseInt(params.memberId);
    
    if (isNaN(orgId) || isNaN(memberId)) {
      return NextResponse.json(
        { error: 'Invalid organization or member ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, role } = body;

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (status !== undefined) updateData.status = status;
    if (role !== undefined) updateData.role = role;

    const updatedMembership = await db
      .update(memberships)
      .set(updateData)
      .where(
        and(
          eq(memberships.id, memberId),
          eq(memberships.orgId, orgId)
        )
      )
      .returning();

    if (updatedMembership.length === 0) {
      return NextResponse.json(
        { error: 'Membership not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedMembership[0]);
  } catch (error) {
    console.error('PATCH /api/organizations/[id]/members/[memberId] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; memberId: string } }
) {
  try {
    const orgId = parseInt(params.id);
    const memberId = parseInt(params.memberId);
    
    if (isNaN(orgId) || isNaN(memberId)) {
      return NextResponse.json(
        { error: 'Invalid organization or member ID' },
        { status: 400 }
      );
    }

    const deletedMembership = await db
      .delete(memberships)
      .where(
        and(
          eq(memberships.id, memberId),
          eq(memberships.orgId, orgId)
        )
      )
      .returning();

    if (deletedMembership.length === 0) {
      return NextResponse.json(
        { error: 'Membership not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/organizations/[id]/members/[memberId] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
