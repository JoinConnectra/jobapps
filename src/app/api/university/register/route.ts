import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, organizations, memberships } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      universityName,
      domain,
      contactEmail,
      adminName,
      password, // not stored here; auth provider handles
      location,
      type,
      description,
    } = body;

    if (!universityName || !contactEmail) {
      return NextResponse.json({ error: 'universityName and contactEmail are required' }, { status: 400 });
    }

    const now = new Date();

    // Ensure app-level user exists
    let existing = await db.select().from(users).where(eq(users.email, contactEmail)).limit(1);
    if (existing.length === 0) {
      existing = await db.insert(users).values({
        email: contactEmail,
        name: adminName || universityName,
        phone: null,
        locale: 'en',
        avatarUrl: null,
        accountType: 'university',
        createdAt: now,
        updatedAt: now,
      }).returning() as any;
    } else {
      // Update role if needed
      await db.update(users).set({ accountType: 'university', updatedAt: now }).where(eq(users.id, (existing[0] as any).id));
    }

    const adminUserId = (existing[0] as any).id as number;

    // Create university organization
    const slug = String(universityName).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const org = await db.insert(organizations).values({
      name: universityName,
      slug,
      type: 'university',
      plan: 'free',
      seatLimit: 20,
      createdAt: now,
      updatedAt: now,
    }).returning();

    // Store extended fields on organizations via existing columns if present
    // If custom columns don't exist, they are ignored at app-level for now.

    // Add admin membership
    await db.insert(memberships).values({
      userId: adminUserId,
      orgId: org[0].id,
      role: 'admin',
      createdAt: now,
    });

    return NextResponse.json({ ok: true, orgId: org[0].id });
  } catch (error) {
    console.error('POST /api/university/register error:', error);
    return NextResponse.json({ error: 'Failed to register university' }, { status: 500 });
  }
}


