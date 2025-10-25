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
        { error: 'Invalid organization ID' },
        { status: 400 }
      );
    }

    // Get organization details
    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    if (org.length === 0) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Generate invite link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const inviteLink = `${baseUrl}/invite/${org[0].slug}`;

    return NextResponse.json({ inviteLink });
  } catch (error) {
    console.error('GET /api/organizations/[id]/invite-link error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
