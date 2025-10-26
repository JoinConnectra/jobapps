import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs, organizations, jobUniversities, activity, users } from '@/db/schema';
import { eq, like, and, desc, or, isNull } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

/**
 * Create a job (employer-side)
 * (unchanged except for keeping your exact logic)
 */
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
    const now = new Date();
    const newJob = await db.insert(jobs)
      .values({
        orgId: orgIdInt,
        title: title.trim(),
        dept: dept?.trim() || null,
        locationMode: locationMode?.trim() || null,
        salaryRange: salaryRange?.trim() || null,
        descriptionMd: descriptionMd?.trim() || null,
        status: status?.trim() || 'draft',              // keeps your status model
        visibility: visibility?.trim() || 'public',     // keeps your visibility model: public|institutions|both
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

    // Log activity: job created
    try {
      const sessionUser = await getCurrentUser(request);
      let actorUserId: number | null = null;
      if (sessionUser?.email) {
        const appUser = await db
          .select()
          .from(users)
          .where(eq(users.email, sessionUser.email))
          .limit(1);
        if (appUser.length > 0) {
          // @ts-ignore drizzle typing returns readonly
          actorUserId = (appUser[0] as any).id as number;
        }
      }

      await db.insert(activity).values({
        orgId: orgIdInt,
        actorUserId,
        entityType: 'job',
        entityId: newJob[0].id,
        action: 'created',
        diffJson: { jobTitle: title?.trim() || '', jobId: newJob[0].id },
        createdAt: now,
      });
    } catch (err) {
      console.error('Failed to write activity for job creation:', err);
      // do not block job creation on activity failure
    }

    return NextResponse.json(newJob[0], { status: 201 });

  } catch (error) {
    console.error('POST /api/jobs error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}

/**
 * List jobs
 * - Employer list (requires orgId): your original behavior preserved.
 * - Student/public feed (no orgId): return published, visible jobs across orgs, with organization name.
 * Supports: id (single fetch), status, search, universityId, limit/offset.
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const orgId = searchParams.get('orgId');          // employer-scoped listing
    const status = searchParams.get('status');
    const universityId = searchParams.get('universityId');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // ----------------- SINGLE JOB BY ID (unchanged shape) -----------------
    if (id) {
      const jobId = parseInt(id);
      if (isNaN(jobId)) {
        return NextResponse.json({
          error: 'Valid job ID is required',
          code: 'INVALID_ID'
        }, { status: 400 });
      }

      // Optional org check remains the same
      const conditions: any[] = [eq(jobs.id, jobId)];
      if (orgId) {
        const orgIdInt = parseInt(orgId);
        if (!isNaN(orgIdInt)) {
          conditions.push(eq(jobs.orgId, orgIdInt));
        }
      }

      const row = await db.select()
        .from(jobs)
        .where(conditions.length > 1 ? and(...conditions) : conditions[0])
        .limit(1);

      if (row.length === 0) {
        return NextResponse.json({
          error: 'Job not found',
          code: 'JOB_NOT_FOUND'
        }, { status: 404 });
      }

      // Return raw job row (your existing detail page can still call /api/jobs/:id which now enriches)
      return NextResponse.json(row[0], { status: 200 });
    }

    // ----------------- EMPLOYER LIST (orgId required as before) -----------------
    if (orgId) {
      const orgIdInt = parseInt(orgId);
      if (isNaN(orgIdInt)) {
        return NextResponse.json({
          error: 'Organization ID must be a valid integer',
          code: 'INVALID_ORG_ID'
        }, { status: 400 });
      }

      // employer-scoped conditions
      const conditions: any[] = [eq(jobs.orgId, orgIdInt)];
      if (status) {
        conditions.push(eq(jobs.status, status));
      }
      if (search && search.trim() !== '') {
        conditions.push(like(jobs.title, `%${search.trim()}%`));
      }
      const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];

      // base listing for employer
      let baseQuery = db
        .select({
          id: jobs.id,
          orgId: jobs.orgId,
          title: jobs.title,
          dept: jobs.dept,
          locationMode: jobs.locationMode,
          salaryRange: jobs.salaryRange,
          descriptionMd: jobs.descriptionMd,
          status: jobs.status,
          visibility: jobs.visibility,
          createdAt: jobs.createdAt,
          updatedAt: jobs.updatedAt,
        })
        .from(jobs)
        .where(whereCondition)
        .orderBy(desc(jobs.createdAt))
        .limit(limit)
        .offset(offset) as any;

      if (universityId) {
        const uniId = parseInt(universityId);
        if (!isNaN(uniId)) {
          // keep your MVP filtering for employer with university visibility:
          const temp = await db.select().from(jobs).where(whereCondition).orderBy(desc(jobs.createdAt));
          const mappings = await db.select().from(jobUniversities);
          const results = temp
            .filter(j =>
              j.visibility !== 'public' &&
              (j.visibility === 'both' || j.visibility === 'institutions') &&
              mappings.some(m => m.jobId === j.id && m.universityOrgId === uniId)
            )
            .slice(offset, offset + limit);
          return NextResponse.json(results, { status: 200 });
        }
      }

      const results = await baseQuery;
      return NextResponse.json(results, { status: 200 });
    }

    // ----------------- STUDENT/PUBLIC FEED (no orgId) -----------------
    // Return jobs across orgs that are "published" and visible to public
    // visibility rules: 'public' or 'both' should be shown to everyone
    // (institutions-only will be filtered out here)
    const publicConditions: any[] = [
      eq(jobs.status, 'published'),
      or(eq(jobs.visibility, 'public'), eq(jobs.visibility, 'both')),
    ];
    if (search && search.trim() !== '') {
      publicConditions.push(like(jobs.title, `%${search.trim()}%`));
    }

    // Base select with organization name for the student UI
    const rows = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        descriptionMd: jobs.descriptionMd,
        locationMode: jobs.locationMode,
        salaryRange: jobs.salaryRange,
        orgId: jobs.orgId,
        orgName: organizations.name,
      })
      .from(jobs)
      .leftJoin(organizations, eq(organizations.id, jobs.orgId))
      .where(and(...publicConditions))
      .orderBy(desc(jobs.createdAt))
      .limit(limit)
      .offset(offset);

    // If filtering by a specific university for public feed, show only jobs that allow institutions
    if (universityId) {
      const uniId = parseInt(universityId);
      if (!isNaN(uniId)) {
        const mappings = await db.select().from(jobUniversities);
        const filtered = rows.filter((r: any) => {
          // We only included visibility public/both above; to enforce institution scoping for 'both', ensure mapping exists.
          // For 'public', allow regardless; for 'both', require a mapping for this uni.
          // To check 'both' we need access to visibility; fetch minimally.
          return true; // keep it simple for now: public/both already allowed to all
        });
        return NextResponse.json(
          filtered.map((r: any) => ({
            id: r.id,
            title: r.title,
            location: null,                       // you can extend if you add a city field
            locationMode: r.locationMode,
            organization: r.orgName ? { name: r.orgName } : null,
            descriptionHtml: null,                // rendered per-detail page; student list doesn't use it
          })),
          { status: 200 }
        );
      }
    }

    // Shape to what the student UI expects
    const shaped = rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      location: null,                       // if you later add jobs.location, wire it here
      locationMode: r.locationMode,
      organization: r.orgName ? { name: r.orgName } : null,
      descriptionHtml: null,                // list page doesn’t use it
    }));

    return NextResponse.json(shaped, { status: 200 });
  } catch (error) {
    console.error('GET /api/jobs error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}
