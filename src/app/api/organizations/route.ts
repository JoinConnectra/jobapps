import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { organizations, memberships, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, type, plan, seatLimit } = body;

    if (!name || !slug || !type) {
      return NextResponse.json(
        { error: 'Name, slug, and type are required', code: 'MISSING_FIELDS' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existing = await db
      .select()
      .from(organizations)
      .where(eq(organizations.slug, slug.trim()))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Slug already exists', code: 'SLUG_EXISTS' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const newOrg = await db
      .insert(organizations)
      .values({
        name: name.trim(),
        slug: slug.trim(),
        type: type.trim(),
        plan: plan?.trim() || null,
        seatLimit: seatLimit || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    // Attach creator as admin member
    const session = await auth.api.getSession({ headers: request.headers });
    if (session?.user?.email) {
      // find or create app user by email
      const email = session.user.email;
      let appUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (appUser.length === 0) {
        const inserted = await db.insert(users).values({
          email,
          name: session.user.name || email,
          phone: null,
          locale: 'en',
          avatarUrl: session.user.image || null,
          createdAt: now,
          updatedAt: now,
        }).returning();
        appUser = inserted as any;
      }
      await db.insert(memberships).values({
        userId: appUser[0].id,
        orgId: newOrg[0].id,
        role: 'admin',
        createdAt: now,
      });
    }

    return NextResponse.json(newOrg[0], { status: 201 });
  } catch (error) {
    console.error('POST /api/organizations error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const slug = searchParams.get('slug');
    const listMine = searchParams.get('mine');
    const type = searchParams.get('type');

    if (id) {
      const orgId = parseInt(id);
      if (isNaN(orgId)) {
        return NextResponse.json(
          { error: 'Invalid ID', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const org = await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);

      if (org.length === 0) {
        return NextResponse.json(
          { error: 'Organization not found', code: 'ORG_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(org[0], { status: 200 });
    }

    if (slug) {
      const org = await db
        .select()
        .from(organizations)
        .where(eq(organizations.slug, slug.trim()))
        .limit(1);

      if (org.length === 0) {
        return NextResponse.json(
          { error: 'Organization not found', code: 'ORG_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(org[0], { status: 200 });
    }

    // If client asks for current user's organizations (scoped view)
    if (listMine === 'true') {
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // our auth "user" table uses text ids, but app users table is numeric. For MVP we scope by email
      const me = await db.select().from(users).where(eq(users.email, session.user.email)).limit(1);
      if (me.length === 0) {
        return NextResponse.json([], { status: 200 });
      }

      let rows = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          slug: organizations.slug,
          type: organizations.type,
          plan: organizations.plan,
          seatLimit: organizations.seatLimit,
          createdAt: organizations.createdAt,
          updatedAt: organizations.updatedAt,
        })
        .from(memberships)
        .innerJoin(organizations, eq(memberships.orgId, organizations.id))
        .where(eq(memberships.userId, me[0].id));

      if (type) {
        rows = rows.filter((o) => o.type === type);
      }

      return NextResponse.json(rows, { status: 200 });
    }

    // Default: list organizations, optionally by type
    let orgs = await db.select().from(organizations);
    if (type) {
      orgs = orgs.filter((o) => (o as any).type === type);
    }
    return NextResponse.json(orgs, { status: 200 });
  } catch (error) {
    console.error('GET /api/organizations error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
