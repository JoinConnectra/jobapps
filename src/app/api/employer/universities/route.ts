import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { organizations, universityAuthorizations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// List universities an employer has approved access to (or list all universities to request)
export async function GET(request: NextRequest) {
  try {
    const orgIdParam = request.nextUrl.searchParams.get('orgId');
    const orgId = orgIdParam ? parseInt(orgIdParam) : NaN;

    // List all universities; optionally filter to approved for a given company org
    if (orgId && !Number.isNaN(orgId)) {
      const rows = await db
        .select({ id: organizations.id, name: organizations.name })
        .from(organizations)
        .where(eq(organizations.type, 'university'));

      // mark if approved
      const approvals = await db
        .select()
        .from(universityAuthorizations)
        .where(and(eq(universityAuthorizations.companyOrgId, orgId), eq(universityAuthorizations.status, 'approved')));

      const approvedIds = new Set(approvals.map(a => a.universityOrgId));
      return NextResponse.json(rows.map(r => ({ ...r, approved: approvedIds.has(r.id) })));
    }

    const rows = await db
      .select({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .where(eq(organizations.type, 'university'));
    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET employer universities error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


