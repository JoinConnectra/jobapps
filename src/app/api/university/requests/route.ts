import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { universityAuthorizations, organizations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Find user's primary org (assume single org membership already fetched client-side)
    // For now, accept orgId from query
    const orgIdParam = request.nextUrl.searchParams.get('orgId');
    const orgId = orgIdParam ? parseInt(orgIdParam) : NaN;
    if (!orgId || Number.isNaN(orgId)) return NextResponse.json({ error: 'orgId required' }, { status: 400 });

    const rows = await db
      .select({
        id: universityAuthorizations.id,
        companyOrgId: universityAuthorizations.companyOrgId,
        companyName: organizations.name,
        status: universityAuthorizations.status,
        createdAt: universityAuthorizations.createdAt,
      })
      .from(universityAuthorizations)
      .leftJoin(organizations, eq(organizations.id, universityAuthorizations.companyOrgId))
      .where(and(eq(universityAuthorizations.universityOrgId, orgId)));

    return NextResponse.json(rows);
  } catch (e) {
    console.error('GET /api/university/requests error:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


