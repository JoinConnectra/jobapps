import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq, like, or } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, type, plan, seatLimit } = body;

    // Validate required fields
    if (!name || !slug || !type) {
      return NextResponse.json(
        { 
          error: 'Missing required fields: name, slug, and type are required',
          code: 'MISSING_REQUIRED_FIELDS'
        },
        { status: 400 }
      );
    }

    // Validate name is not empty after trimming
    if (name.trim() === '') {
      return NextResponse.json(
        { 
          error: 'Name cannot be empty',
          code: 'INVALID_NAME'
        },
        { status: 400 }
      );
    }

    // Validate slug is not empty after trimming
    if (slug.trim() === '') {
      return NextResponse.json(
        { 
          error: 'Slug cannot be empty',
          code: 'INVALID_SLUG'
        },
        { status: 400 }
      );
    }

    // Validate type
    if (type !== 'company' && type !== 'university') {
      return NextResponse.json(
        { 
          error: 'Type must be either "company" or "university"',
          code: 'INVALID_TYPE'
        },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingOrg = await db.select()
      .from(organizations)
      .where(eq(organizations.slug, slug.trim()))
      .limit(1);

    if (existingOrg.length > 0) {
      return NextResponse.json(
        { 
          error: 'An organization with this slug already exists',
          code: 'SLUG_ALREADY_EXISTS'
        },
        { status: 400 }
      );
    }

    // Prepare insert data
    const now = new Date().toISOString();
    const insertData: any = {
      name: name.trim(),
      slug: slug.trim(),
      type,
      createdAt: now,
      updatedAt: now
    };

    // Add optional fields if provided
    if (plan !== undefined && plan !== null) {
      insertData.plan = plan;
    }

    if (seatLimit !== undefined && seatLimit !== null) {
      insertData.seatLimit = seatLimit;
    }

    // Insert new organization
    const newOrganization = await db.insert(organizations)
      .values(insertData)
      .returning();

    return NextResponse.json(newOrganization[0], { status: 201 });

  } catch (error: any) {
    console.error('POST error:', error);
    
    // Handle unique constraint violation
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json(
        { 
          error: 'An organization with this slug already exists',
          code: 'SLUG_ALREADY_EXISTS'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Internal server error: ' + error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single organization by ID
    if (id) {
      // Validate ID is a valid integer
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json(
          { 
            error: 'Valid ID is required',
            code: 'INVALID_ID'
          },
          { status: 400 }
        );
      }

      const organization = await db.select()
        .from(organizations)
        .where(eq(organizations.id, parseInt(id)))
        .limit(1);

      if (organization.length === 0) {
        return NextResponse.json(
          { 
            error: 'Organization not found',
            code: 'NOT_FOUND'
          },
          { status: 404 }
        );
      }

      return NextResponse.json(organization[0], { status: 200 });
    }

    // List organizations with pagination and search
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const search = searchParams.get('search');

    let query = db.select().from(organizations);

    // Apply search filter if provided
    if (search && search.trim() !== '') {
      const searchTerm = `%${search.trim()}%`;
      query = query.where(
        or(
          like(organizations.name, searchTerm),
          like(organizations.slug, searchTerm)
        )
      ) as any;
    }

    const results = await query.limit(limit).offset(offset);

    return NextResponse.json(results, { status: 200 });

  } catch (error: any) {
    console.error('GET error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error: ' + error.message 
      },
      { status: 500 }
    );
  }
}