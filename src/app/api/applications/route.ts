// /src/app/api/applications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { applications, jobs, organizations, activity, users } from '@/db/schema';
import { eq, and, asc, or, like, isNull } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

// Email validation helper
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/** Resolve the current DB user from session; return null if unauthenticated or not found */
async function getDbUserFromSession(request: NextRequest) {
  try {
    const sessionUser = await getCurrentUser(request);
    if (!sessionUser?.email) return null;

    const [dbUser] = await db
      .select({ id: users.id, email: users.email, name: users.name, accountType: users.accountType })
      .from(users)
      .where(eq(users.email, sessionUser.email))
      .limit(1);

    return dbUser ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Required (original)
    const { jobId, applicantEmail } = body;

    // Optional (legacy)
    const { applicantUserId, stage, source, applicantUniversityId } = body;

    // Optional (new fields)
    const {
      applicantName,
      phone,
      whatsapp,
      location,
      city,
      province,
      cnic,

      linkedinUrl,
      portfolioUrl,
      githubUrl,

      workAuth,
      needSponsorship,
      willingRelocate,
      remotePref,
      earliestStart,
      salaryExpectation,

      expectedSalaryPkr,
      noticePeriodDays,
      experienceYears,

      university,
      degree,
      graduationYear,
      gpa,
      gpaScale,
      // coverLetter,
    } = body;

    // --- NEW: derive session + DB user
    const dbUser = await getDbUserFromSession(request);

    // Validate jobId
    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId is required', code: 'MISSING_JOB_ID' },
        { status: 400 }
      );
    }
    const parsedJobId = parseInt(jobId);
    if (isNaN(parsedJobId)) {
      return NextResponse.json(
        { error: 'jobId must be a valid integer', code: 'INVALID_JOB_ID' },
        { status: 400 }
      );
    }

    // Decide which email to use:
    // - Prefer body.applicantEmail if provided & valid
    // - Else fall back to session email (if logged in)
    let effectiveEmail: string | null = null;
    if (applicantEmail && isValidEmail(String(applicantEmail))) {
      effectiveEmail = String(applicantEmail).toLowerCase().trim();
    } else if (dbUser?.email) {
      effectiveEmail = String(dbUser.email).toLowerCase().trim();
    }

    if (!effectiveEmail) {
      return NextResponse.json(
        { error: 'applicantEmail is required (or sign in so we can infer it)', code: 'MISSING_APPLICANT_EMAIL' },
        { status: 400 }
      );
    }

    // Ensure job exists
    const job = await db
      .select()
      .from(jobs)
      .where(eq(jobs.id, parsedJobId))
      .limit(1);
    if (job.length === 0) {
      return NextResponse.json(
        { error: 'Job not found', code: 'JOB_NOT_FOUND' },
        { status: 400 }
      );
    }
    const jobRow = job[0];

    // Prepare application data (existing behavior, extended)
    const now = new Date();
    const applicationData: any = {
      jobId: parsedJobId,
      applicantEmail: effectiveEmail,
      stage: stage || 'applied',
      createdAt: now,
      updatedAt: now,
    };

    // --- NEW: Always attach the current DB user if available
    // (This does NOT remove your legacy support; it only enriches the row)
    if (dbUser?.id) {
      applicationData.applicantUserId = dbUser.id;
      if (!applicantName) {
        applicationData.applicantName = dbUser.name ?? null;
      }
    }

    // Optional legacy (kept): if caller provided applicantUserId explicitly, keep it,
    // but do not clobber a valid session-derived userId
    if (applicationData.applicantUserId == null && applicantUserId !== undefined && applicantUserId !== null) {
      const parsedUserId = parseInt(applicantUserId);
      if (!isNaN(parsedUserId)) {
        applicationData.applicantUserId = parsedUserId;
      }
    }

    if (source) applicationData.source = String(source).trim();

    if (applicantUniversityId !== undefined && applicantUniversityId !== null) {
      const uniId = parseInt(String(applicantUniversityId));
      if (!isNaN(uniId)) applicationData.applicantUniversityId = uniId;
    }

    // Optional NEW fields — only add if provided to avoid overwriting defaults/nulls
    const setIf = (key: string, val: any) => {
      if (val !== undefined && val !== null && val !== '') {
        applicationData[key] = val;
      }
    };

    setIf('applicantName', applicantName?.toString().trim());
    setIf('phone', phone?.toString().trim());
    setIf('whatsapp', whatsapp?.toString().trim());
    setIf('location', location?.toString().trim());
    setIf('city', city?.toString().trim());
    setIf('province', province?.toString().trim());
    setIf('cnic', cnic?.toString().trim());

    setIf('linkedinUrl', linkedinUrl?.toString().trim());
    setIf('portfolioUrl', portfolioUrl?.toString().trim());
    setIf('githubUrl', githubUrl?.toString().trim());

    setIf('workAuth', workAuth?.toString());
    if (needSponsorship !== undefined && needSponsorship !== null) {
      applicationData.needSponsorship = Boolean(needSponsorship);
    }
    if (willingRelocate !== undefined && willingRelocate !== null) {
      applicationData.willingRelocate = Boolean(willingRelocate);
    }
    setIf('remotePref', remotePref?.toString());
    setIf('earliestStart', earliestStart?.toString());
    setIf('salaryExpectation', salaryExpectation?.toString());

    if (expectedSalaryPkr !== undefined && expectedSalaryPkr !== null && expectedSalaryPkr !== '') {
      const n = Number(expectedSalaryPkr);
      if (!Number.isNaN(n)) applicationData.expectedSalaryPkr = n;
    }
    if (noticePeriodDays !== undefined && noticePeriodDays !== null && noticePeriodDays !== '') {
      const n = Number(noticePeriodDays);
      if (!Number.isNaN(n)) applicationData.noticePeriodDays = n;
    }
    setIf('experienceYears', experienceYears?.toString());

    setIf('university', university?.toString().trim());
    setIf('degree', degree?.toString().trim());
    if (graduationYear !== undefined && graduationYear !== null && graduationYear !== '') {
      const n = Number(graduationYear);
      if (!Number.isNaN(n)) applicationData.graduationYear = n;
    }
    setIf('gpa', gpa?.toString());
    setIf('gpaScale', gpaScale?.toString());

    // --- NEW: Idempotency & legacy-upgrade handling
    // 1) If this user already has an application for this job, return that instead of a new row
    if (applicationData.applicantUserId) {
      const [existingForUser] = await db
        .select({ id: applications.id })
        .from(applications)
        .where(and(
          eq(applications.jobId, parsedJobId),
          eq(applications.applicantUserId, applicationData.applicantUserId)
        ))
        .limit(1);

      if (existingForUser) {
        return NextResponse.json({ id: existingForUser.id, ok: true, alreadyApplied: true }, { status: 200 });
      }
    }

    // 2) If a legacy row exists for same job + email with NULL user id, "claim" it
    const [legacy] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(and(
        eq(applications.jobId, parsedJobId),
        eq(applications.applicantEmail, effectiveEmail),
        isNull(applications.applicantUserId)
      ))
      .limit(1);

    if (legacy) {
      // Attach the user id if present; update other fields provided
      await db
        .update(applications)
        .set({
          ...applicationData,
          // ensure we don't rewrite createdAt on legacy
          createdAt: undefined,
          updatedAt: new Date(),
        })
        .where(eq(applications.id, legacy.id));

      // Write activity (best-effort)
      try {
        let actorUserId: number | null = null;
        if (dbUser?.id) actorUserId = dbUser.id;
        await db.insert(activity).values({
          orgId: jobRow.orgId,
          actorUserId,
          entityType: 'application',
          entityId: legacy.id,
          action: 'applied',
          diffJson: {
            applicantEmail: effectiveEmail,
            jobId: jobRow.id,
            jobTitle: jobRow.title,
            upgradedLegacy: true,
          },
          createdAt: new Date(),
        });
      } catch (err) {
        console.error('Failed to write activity for upgraded legacy application:', err);
      }

      return NextResponse.json({ id: legacy.id, ok: true, upgradedLegacy: true }, { status: 200 });
    }

    // 3) Insert a fresh application
    const newApplication = await db
      .insert(applications)
      .values(applicationData)
      .returning();

    // Write activity: applicant applied to job (org scoped)
    try {
      let actorUserId: number | null = null;
      if (dbUser?.id) actorUserId = dbUser.id;

      await db.insert(activity).values({
        orgId: jobRow.orgId,
        actorUserId,
        entityType: 'application',
        entityId: newApplication[0].id,
        action: 'applied',
        diffJson: {
          applicantEmail: applicationData.applicantEmail,
          jobId: jobRow.id,
          jobTitle: jobRow.title,
        },
        createdAt: new Date(),
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

    // --- NEW: my applications (student portal) without breaking existing filters
    const mine = searchParams.get('mine'); // if "1", return current user's apps (incl. legacy email-only)

    if (mine === '1') {
      const dbUser = await getDbUserFromSession(request);
      if (!dbUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const results = await db
        .select({
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
        .innerJoin(jobs, eq(applications.jobId, jobs.id))
        .where(
          or(
            eq(applications.applicantUserId, dbUser.id),
            and(
              isNull(applications.applicantUserId),
              eq(applications.applicantEmail, dbUser.email)
            )
          )
        );

      return NextResponse.json(results, { status: 200 });
    }

    // ---- EXISTING BEHAVIOR BELOW (kept) ----

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

        // NEW applicant fields
        applicantName: applications.applicantName,
        phone: applications.phone,
        whatsapp: applications.whatsapp,
        location: applications.location,
        city: applications.city,
        province: applications.province,
        cnic: applications.cnic,

        linkedinUrl: applications.linkedinUrl,
        portfolioUrl: applications.portfolioUrl,
        githubUrl: applications.githubUrl,

        workAuth: applications.workAuth,
        needSponsorship: applications.needSponsorship,
        willingRelocate: applications.willingRelocate,
        remotePref: applications.remotePref,
        earliestStart: applications.earliestStart,
        salaryExpectation: applications.salaryExpectation,

        expectedSalaryPkr: applications.expectedSalaryPkr,
        noticePeriodDays: applications.noticePeriodDays,
        experienceYears: applications.experienceYears,

        university: applications.university,
        degree: applications.degree,
        graduationYear: applications.graduationYear,
        gpa: applications.gpa,
        gpaScale: applications.gpaScale,

        // Resume metadata
        resumeS3Key: applications.resumeS3Key,
        resumeFilename: applications.resumeFilename,
        resumeMime: applications.resumeMime,
        resumeSize: applications.resumeSize,
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
    const conditions: any[] = [];

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

      if (orgId) {
        const parsedOrgId = parseInt(orgId);
        if (!isNaN(parsedOrgId)) {
          conditions.push(eq(jobs.orgId, parsedOrgId));
        }
      }
    }

    if (conditions.length > 0) {
      // @ts-ignore
      query = query.where(and(...conditions)) as any;
    }

    // const results = await query.orderBy(asc(applications.createdAt)).limit(limit).offset(offset);
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
