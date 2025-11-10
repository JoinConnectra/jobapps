import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { jobs, organizations, jobUniversities, activity, users } from '@/db/schema-pg';
import { eq, like, and, desc, or, isNull, inArray } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { auth } from '@/lib/auth';

/**
 * Helper function to get user's university affiliation
 */
async function getUserUniversityAffiliation(request: NextRequest): Promise<number | null> {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user?.email) return null;

    // Get user from database
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, session.user.email))
      .limit(1);

    if (user.length === 0) return null;

    // If user has accountType 'university', find their university organization
    if (user[0].accountType === 'university') {
      const universityOrg = await db
        .select({ id: organizations.id })
        .from(organizations)
        .innerJoin(users, eq(users.id, user[0].id))
        .where(and(
          eq(organizations.type, 'university'),
          eq(organizations.id, user[0].id) // (kept as-is; adjust if org-user mapping differs)
        ))
        .limit(1);

      return universityOrg.length > 0 ? universityOrg[0].id : null;
    }

    // For students/applicants, try to match by email domain
    const emailDomain = session.user.email.split('@')[1]?.toLowerCase();
    if (!emailDomain) return null;

    // Find university organization by matching email domain (simple heuristic)
    const universityOrg = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(and(
        eq(organizations.type, 'university'),
        like(organizations.name, `%${emailDomain.split('.')[0]}%`)
      ))
      .limit(1);

    return universityOrg.length > 0 ? universityOrg[0].id : null;
  } catch (error) {
    console.error('Error getting user university affiliation:', error);
    return null;
  }
}

/**
 * Create a job (employer-side)
 * (keeps your logic; adds optional new fields)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orgId,
      title,
      dept,
      locationMode,
      salaryRange,
      descriptionMd,
      status,
      visibility,
      universityIds,

      /** NEW optional fields */
      location,
      seniority,
      skillsCsv,
    } = body;

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
        status: status?.trim() || 'draft',
        visibility: visibility?.trim() || 'public',
        /** NEW fields */
        location: location?.trim() || null,
        seniority: seniority?.trim() || null,
        skillsCsv: skillsCsv?.trim() || null,

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

      // raw row
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

      const conditions: any[] = [eq(jobs.orgId, orgIdInt)];
      if (status) {
        conditions.push(eq(jobs.status, status));
      }
      if (search && search.trim() !== '') {
        conditions.push(like(jobs.title, `%${search.trim()}%`));
      }
      const whereCondition = conditions.length > 1 ? and(...conditions) : conditions[0];

      // include NEW fields in employer list
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

          /** NEW fields */
          location: jobs.location,
          seniority: jobs.seniority,
          skillsCsv: jobs.skillsCsv,
        })
        .from(jobs)
        .where(whereCondition)
        .orderBy(desc(jobs.createdAt))
        .limit(limit)
        .offset(offset) as any;

      if (universityId) {
        const uniId = parseInt(universityId);
        if (!isNaN(uniId)) {
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
    const userUniversityId = await getUserUniversityAffiliation(request);

    const baseConditions: any[] = [eq(jobs.status, 'published')];
    if (search && search.trim() !== '') {
      baseConditions.push(like(jobs.title, `%${search.trim()}%`));
    }

    const allJobs = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        dept: jobs.dept,
        descriptionMd: jobs.descriptionMd,
        locationMode: jobs.locationMode,
        salaryRange: jobs.salaryRange,
        orgId: jobs.orgId,
        visibility: jobs.visibility,
        createdAt: jobs.createdAt,
        orgName: organizations.name,

        /** NEW fields */
        location: jobs.location,
        seniority: jobs.seniority,
        skillsCsv: jobs.skillsCsv,
      })
      .from(jobs)
      .leftJoin(organizations, eq(organizations.id, jobs.orgId))
      .where(and(...baseConditions))
      .orderBy(desc(jobs.createdAt));

    let filteredJobs = allJobs.filter((job: any) => {
      if (job.visibility === 'public') return true;
      if (job.visibility === 'both') return true;
      if (job.visibility === 'institutions') {
        return userUniversityId !== null;
      }
      return false;
    });

    if (userUniversityId) {
      const universityJobMappings = await db
        .select()
        .from(jobUniversities)
        .where(eq(jobUniversities.universityOrgId, userUniversityId));

      const universityJobIds = new Set(universityJobMappings.map(m => m.jobId));

      const additionalJobs = allJobs.filter((job: any) =>
        universityJobIds.has(job.id) &&
        !filteredJobs.some(fj => fj.id === job.id)
      );

      filteredJobs = [...filteredJobs, ...additionalJobs];
    }

    const rows = filteredJobs.slice(offset, offset + limit);

    // org logos + websites
    const orgIds = [...new Set(rows.map((r: any) => r.orgId))];
    const orgLogos: Record<number, string | null> = {};
    const orgWebsites: Record<number, string | null> = {};

    if (orgIds.length > 0) {
      const orgRows = await db
        .select({
          id: organizations.id,
          logoUrl: organizations.logoUrl,
          link: organizations.link
        })
        .from(organizations)
        .where(inArray(organizations.id, orgIds));

      orgRows.forEach((org) => {
        orgLogos[org.id] = org.logoUrl || null;
        orgWebsites[org.id] = org.link || null;
      });
    }

    const shaped = rows.map((r: any) => ({
      id: r.id,
      title: r.title,
      /** NEW: surface extra fields for student UI consumers */
      location: r.location || null,
      locationMode: r.locationMode,
      seniority: r.seniority || null,
      skillsCsv: r.skillsCsv || null,

      organization: r.orgName ? {
        name: r.orgName,
        logoUrl: orgLogos[r.orgId] || null,
        website: orgWebsites[r.orgId] || null
      } : null,

      descriptionMd: r.descriptionMd,
      descriptionHtml: null,
      salaryRange: r.salaryRange,
      dept: r.dept,
      organizationName: r.orgName,
      organizationLogoUrl: orgLogos[r.orgId] || null,
      organizationWebsite: orgWebsites[r.orgId] || null,
      postedAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
      tags: [],
    }));

    return NextResponse.json(shaped, { status: 200 });
  } catch (error) {
    console.error('GET /api/jobs error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error')
    }, { status: 500 });
  }
}
