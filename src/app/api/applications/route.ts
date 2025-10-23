import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { applications, jobs, organizations, studentProfiles, activity, users } from '@/db/schema';
import { eq, and, asc, or, like } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

// Email validation helper
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, applicantEmail, applicantUserId, stage, source, applicantUniversityId } = body;

    // Validate required fields
    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId is required', code: 'MISSING_JOB_ID' },
        { status: 400 }
      );
    }

    if (!applicantEmail) {
      return NextResponse.json(
        { error: 'applicantEmail is required', code: 'MISSING_APPLICANT_EMAIL' },
        { status: 400 }
      );
    }

    // Validate email format
    if (!isValidEmail(applicantEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format', code: 'INVALID_EMAIL_FORMAT' },
        { status: 400 }
      );
    }

    // Validate jobId is a valid integer
    const parsedJobId = parseInt(jobId);
    if (isNaN(parsedJobId)) {
      return NextResponse.json(
        { error: 'jobId must be a valid integer', code: 'INVALID_JOB_ID' },
        { status: 400 }
      );
    }

    // Check if job exists
    const job = await db.select()
      .from(jobs)
      .where(eq(jobs.id, parsedJobId))
      .limit(1);

    if (job.length === 0) {
      return NextResponse.json(
        { error: 'Job not found', code: 'JOB_NOT_FOUND' },
        { status: 400 }
      );
    }

    // Prepare application data
    const now = new Date();
    const applicationData: any = {
      jobId: parsedJobId,
      applicantEmail: applicantEmail.toLowerCase().trim(),
      stage: stage || 'applied',
      createdAt: now,
      updatedAt: now,
    };

    // Add optional fields if provided
    if (applicantUserId !== undefined && applicantUserId !== null) {
      const parsedUserId = parseInt(applicantUserId);
      if (!isNaN(parsedUserId)) {
        applicationData.applicantUserId = parsedUserId;
      }
    }

    if (source) {
      applicationData.source = source.trim();
    }

    if (applicantUniversityId !== undefined && applicantUniversityId !== null) {
      const uniId = parseInt(String(applicantUniversityId));
      if (!isNaN(uniId)) {
        applicationData.applicantUniversityId = uniId;
      }
    }

    // Create application
    const newApplication = await db.insert(applications)
      .values(applicationData)
      .returning();

    // Write activity: applicant applied to job (org scoped)
    try {
      const nowIso = new Date();
      const jobRow = job[0];

      let actorUserId: number | null = null;
      const sessionUser = await getCurrentUser(request);
      if (sessionUser?.email) {
        const appUser = await db.select().from(users).where(eq(users.email, sessionUser.email)).limit(1);
        if (appUser.length > 0) {
          // @ts-ignore drizzle typing returns readonly
          actorUserId = (appUser[0] as any).id as number;
        }
      }

      await db.insert(activity).values({
        orgId: jobRow.orgId,
        actorUserId,
        entityType: 'application',
        entityId: newApplication[0].id,
        action: 'applied',
        diffJson: { applicantEmail: applicationData.applicantEmail, jobId: jobRow.id, jobTitle: jobRow.title },
        createdAt: nowIso,
      });
    } catch (err) {
      console.error('Failed to write activity for application:', err);
      // non-fatal
    }

    return NextResponse.json(newApplication[0], { status: 201 });

  } catch (error) {
    console.error('POST /api/applications error:', error);
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

    // Single application by ID
    if (id) {
      const parsedId = parseInt(id);
      if (isNaN(parsedId)) {
        return NextResponse.json(
          { error: 'Valid ID is required', code: 'INVALID_ID' },
          { status: 400 }
        );
      }

      const application = await db.select({
        id: applications.id,
        jobId: applications.jobId,
        applicantUserId: applications.applicantUserId,
        applicantEmail: applications.applicantEmail,
        stage: applications.stage,
        source: applications.source,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        jobTitle: jobs.title,
        applicantUniversityId: applications.applicantUniversityId,
        applicantUniversityName: organizations.name,
      })
        .from(applications)
        .leftJoin(jobs, eq(applications.jobId, jobs.id))
        .leftJoin(organizations, eq(applications.applicantUniversityId, organizations.id))
        .where(eq(applications.id, parsedId))
        .limit(1);

      if (application.length === 0) {
        return NextResponse.json(
          { error: 'Application not found', code: 'APPLICATION_NOT_FOUND' },
          { status: 404 }
        );
      }

      return NextResponse.json(application[0], { status: 200 });
    }

    // List applications with filters
    const jobId = searchParams.get('jobId');
    const orgId = searchParams.get('orgId');
    const stage = searchParams.get('stage');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');

    // For search functionality, we don't require jobId or orgId
    if (!search && !jobId && !orgId) {
      return NextResponse.json(
        { error: 'Either jobId, orgId, or search is required', code: 'MISSING_FILTER_PARAMS' },
        { status: 400 }
      );
    }

    // Build query with join to jobs table
    let query = db.select({
      id: applications.id,
      jobId: applications.jobId,
      applicantUserId: applications.applicantUserId,
      applicantEmail: applications.applicantEmail,
      stage: applications.stage,
      source: applications.source,
      createdAt: applications.createdAt,
      updatedAt: applications.updatedAt,
      jobTitle: jobs.title,
      orgId: jobs.orgId,
    })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id));

    // Apply filters
    const conditions = [];

    if (jobId) {
      const parsedJobId = parseInt(jobId);
      if (isNaN(parsedJobId)) {
        return NextResponse.json(
          { error: 'jobId must be a valid integer', code: 'INVALID_JOB_ID' },
          { status: 400 }
        );
      }
      conditions.push(eq(applications.jobId, parsedJobId));
    }

    if (orgId) {
      const parsedOrgId = parseInt(orgId);
      if (isNaN(parsedOrgId)) {
        return NextResponse.json(
          { error: 'orgId must be a valid integer', code: 'INVALID_ORG_ID' },
          { status: 400 }
        );
      }
      conditions.push(eq(jobs.orgId, parsedOrgId));
    }

    if (stage) {
      conditions.push(eq(applications.stage, stage.trim()));
    }

    if (search) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(
        or(
          like(applications.applicantEmail, searchTerm),
          like(jobs.title, searchTerm)
        )
      );
      
      // When searching, also filter by orgId if provided
      if (orgId) {
        const parsedOrgId = parseInt(orgId);
        if (!isNaN(parsedOrgId)) {
          conditions.push(eq(jobs.orgId, parsedOrgId));
        }
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    // Order by creation date (oldest first)
    query = query.orderBy(asc(applications.createdAt));

    const results = await query.limit(limit).offset(offset);

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('GET /api/applications error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}