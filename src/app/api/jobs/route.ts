import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs, organizations, jobUniversities } from '@/db/schema';
import { eq, like, and, desc } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orgId, title, dept, locationMode, salaryRange, descriptionMd, status, visibility, universityIds } = body;

    // Validate required fields
    if (!orgId) {
      return NextResponse.json({
        error: 'Organization ID is required',
        code: 'MISSING_ORG_ID'
      }, { status: 400 });
    }

    if (!title || title.trim() === '') {
      return NextResponse.json({
        error: 'Job title is required',
        code: 'MISSING_TITLE'
      }, { status: 400 });
    }

    // Validate orgId is a valid integer
    const orgIdInt = parseInt(orgId);
    if (isNaN(orgIdInt)) {
      return NextResponse.json({
        error: 'Organization ID must be a valid integer',
        code: 'INVALID_ORG_ID'
      }, { status: 400 });
    }

    // Verify organization exists
    const organization = await db.select()
      .from(organizations)
      .where(eq(organizations.id, orgIdInt))
      .limit(1);

    if (organization.length === 0) {
      return NextResponse.json({
        error: 'Organization not found',
        code: 'ORG_NOT_FOUND'
      }, { status: 400 });
    }

    // Prepare insert data with defaults and auto-generated fields
    const now = new Date().toISOString();
    const newJob = await db.insert(jobs)
      .values({
        orgId: orgIdInt,
        title: title.trim(),
        dept: dept?.trim() || null,
        locationMode: locationMode?.trim() || null,
        salaryRange: salaryRange?.trim() || null,
        descriptionMd: descriptionMd?.trim() || null,
        status: status?.trim() || 'draft',
        visibility: visibility?.trim() || 'public',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // If selected institutions provided, create mappings
    if (Array.isArray(universityIds) && universityIds.length > 0) {
      const records = universityIds
        .map((u: any) => parseInt(String(u)))
        .filter((n: number) => !isNaN(n))
        .map((uId: number) => ({ jobId: newJob[0].id, universityOrgId: uId, createdAt: now }));
      if (records.length > 0) {
        await db.insert(jobUniversities).values(records);
      }
    }

    return NextResponse.json(newJob[0], { status: 201 });

  } catch (error) {
    console.error('POST /api/jobs error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const orgId = searchParams.get('orgId');
    const status = searchParams.get('status');
    const universityId = searchParams.get('universityId');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // Handle single job fetch by ID
    if (id) {
      const jobId = parseInt(id);
      
      if (isNaN(jobId)) {
        return NextResponse.json({
          error: 'Valid job ID is required',
          code: 'INVALID_ID'
        }, { status: 400 });
      }

      // Build where condition with optional orgId check for access control
      const conditions = [eq(jobs.id, jobId)];
      if (orgId) {
        const orgIdInt = parseInt(orgId);
        if (!isNaN(orgIdInt)) {
          conditions.push(eq(jobs.orgId, orgIdInt));
        }
      }

      const job = await db.select()
        .from(jobs)
        .where(conditions.length > 1 ? and(...conditions) : conditions[0])
        .limit(1);

      if (job.length === 0) {
        return NextResponse.json({
          error: 'Job not found',
          code: 'JOB_NOT_FOUND'
        }, { status: 404 });
      }

      return NextResponse.json(job[0], { status: 200 });
    }

    // Handle list query with filters
    // Require orgId for multi-tenancy in list queries
    if (!orgId) {
      return NextResponse.json({
        error: 'Organization ID is required for listing jobs',
        code: 'MISSING_ORG_ID'
      }, { status: 400 });
    }

    const orgIdInt = parseInt(orgId);
    if (isNaN(orgIdInt)) {
      return NextResponse.json({
        error: 'Organization ID must be a valid integer',
        code: 'INVALID_ORG_ID'
      }, { status: 400 });
    }

    // Build query with filters
    const conditions = [eq(jobs.orgId, orgIdInt)];

    // Add status filter if provided
    if (status) {
      conditions.push(eq(jobs.status, status));
    }

    // Add search filter if provided
    if (search && search.trim() !== '') {
      conditions.push(like(jobs.title, `%${search.trim()}%`));
    }

    // Execute query with all conditions
    const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];
    
    // If filtering by university visibility, restrict accordingly
    let baseQuery = db.select().from(jobs).where(whereCondition).orderBy(desc(jobs.createdAt)).limit(limit).offset(offset) as any;
    if (universityId) {
      const uniId = parseInt(universityId);
      if (!isNaN(uniId)) {
        // show jobs where visibility is 'both' or 'institutions' and mapped to uniId
        // For SQLite in drizzle, perform a simple subquery filter via IN
        // We'll fetch and filter in-memory for MVP
        const temp = await db.select().from(jobs).where(whereCondition).orderBy(desc(jobs.createdAt));
        const mappings = await db.select().from(jobUniversities);
        const results = temp.filter(j => j.visibility !== 'public' && (j.visibility === 'both' || j.visibility === 'institutions') && mappings.some(m => m.jobId === j.id && m.universityOrgId === uniId)).slice(offset, offset + limit);
        return NextResponse.json(results, { status: 200 });
      }
    }

    const results = await baseQuery;

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('GET /api/jobs error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}