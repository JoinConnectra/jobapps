import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { applications, studentProfiles, studentEducations } from '@/db/schema-pg';
import { eq } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';
import { users } from '@/db/schema-pg';

type AppBody = {
  jobId: number;
  applicantEmail: string;
  applicantName?: string;
  phone?: string;
  whatsapp?: string;
  location?: string;
  city?: string;
  province?: string;
  cnic?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  workAuth?: string;
  needSponsorship?: boolean | null;
  willingRelocate?: boolean | null;
  remotePref?: string;
  earliestStart?: string | null;
  salaryExpectation?: string | null;
  expectedSalaryPkr?: number | null;
  noticePeriodDays?: number | null;
  experienceYears?: string | number | null;

  // education snapshot
  university?: string | null;
  degree?: string | null;
  graduationYear?: number | null;
  gpa?: string | null;
  gpaScale?: string | null;

  // resume snapshot
  resumeS3Key?: string | null;
  resumeFilename?: string | null;
  resumeMime?: string | null;
  resumeSize?: number | null;

  stage?: string;
  source?: string;
  applicantUniversityId?: number | null;
};

export async function POST(req: NextRequest) {
  try {
    const authUser = await getCurrentUser(req);
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [me] = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.email, authUser.email))
      .limit(1);

    if (!me) return NextResponse.json({ error: 'No DB user for email' }, { status: 401 });

    const raw = (await req.json().catch(() => ({}))) as Partial<AppBody>;
    const jobId = Number(raw.jobId);
    if (!jobId || Number.isNaN(jobId)) return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });

    const applicantEmail = (raw.applicantEmail || me.email || '').trim();
    if (!applicantEmail) return NextResponse.json({ error: 'Missing applicantEmail' }, { status: 400 });

    // Load profile + first education row
    const [profile] = await db.select().from(studentProfiles).where(eq(studentProfiles.userId, me.id)).limit(1);
    const [edu] = await db.select().from(studentEducations).where(eq(studentEducations.userId, me.id)).limit(1);

    const merged: AppBody = {
      ...raw,
      jobId,
      applicantEmail,
      applicantName: raw.applicantName ?? me.name ?? undefined,
      // standard fields from profile defaults
      whatsapp: raw.whatsapp ?? profile?.whatsapp ?? undefined,
      province: raw.province ?? profile?.province ?? undefined,
      cnic: raw.cnic ?? profile?.cnic ?? undefined,
      linkedinUrl: raw.linkedinUrl ?? profile?.linkedinUrl ?? undefined,
      portfolioUrl: raw.portfolioUrl ?? profile?.portfolioUrl ?? undefined,
      githubUrl: raw.githubUrl ?? profile?.githubUrl ?? undefined,
      workAuth: raw.workAuth ?? profile?.workAuth ?? undefined,
      needSponsorship: raw.needSponsorship ?? profile?.needSponsorship ?? null,
      willingRelocate: raw.willingRelocate ?? profile?.willingRelocate ?? null,
      remotePref: raw.remotePref ?? profile?.remotePref ?? undefined,
      earliestStart: raw.earliestStart ?? (profile?.earliestStart ? String(profile.earliestStart) : null),
      salaryExpectation: raw.salaryExpectation ?? profile?.salaryExpectation ?? undefined,
      expectedSalaryPkr: raw.expectedSalaryPkr ?? profile?.expectedSalaryPkr ?? null,
      noticePeriodDays: raw.noticePeriodDays ?? profile?.noticePeriodDays ?? null,
      experienceYears:
        raw.experienceYears != null
          ? String(raw.experienceYears)
          : profile?.experienceYears != null
          ? String(profile.experienceYears)
          : null,

      // education snapshot defaults
      degree: raw.degree ?? edu?.degree ?? null,
      graduationYear: raw.graduationYear ?? edu?.endYear ?? null,
      gpa: raw.gpa ?? (edu?.gpa != null ? String(edu.gpa) : null),
      // leave university/gpaScale freeform unless you decide to map
    };

    // Create application snapshot
    const [inserted] = await db
      .insert(applications)
      .values({
        jobId: merged.jobId,
        applicantUserId: me.id,
        applicantEmail: merged.applicantEmail,

        applicantName: merged.applicantName ?? null,
        phone: (raw.phone ?? null) as any,
        whatsapp: merged.whatsapp ?? null,
        location: (raw.location ?? null) as any,
        city: (raw.city ?? null) as any,
        province: merged.province ?? null,
        cnic: merged.cnic ?? null,

        linkedinUrl: merged.linkedinUrl ?? null,
        portfolioUrl: merged.portfolioUrl ?? null,
        githubUrl: merged.githubUrl ?? null,

        workAuth: merged.workAuth ?? null,
        needSponsorship: merged.needSponsorship,
        willingRelocate: merged.willingRelocate,
        remotePref: merged.remotePref ?? null,
        earliestStart: merged.earliestStart ?? null,
        salaryExpectation: merged.salaryExpectation ?? null,
        expectedSalaryPkr: merged.expectedSalaryPkr,
        noticePeriodDays: merged.noticePeriodDays,
        experienceYears: merged.experienceYears != null ? String(merged.experienceYears) : null,

        university: (raw.university ?? null) as any,
        degree: merged.degree ?? null,
        graduationYear: merged.graduationYear,
        gpa: merged.gpa ?? null,
        gpaScale: (raw.gpaScale ?? null) as any,

        resumeS3Key: (raw.resumeS3Key ?? null) as any,
        resumeFilename: (raw.resumeFilename ?? null) as any,
        resumeMime: (raw.resumeMime ?? null) as any,
        resumeSize: (raw.resumeSize ?? null) as any,

        stage: raw.stage ?? 'applied',
        source: raw.source ?? 'student-portal',
        applicantUniversityId: (raw.applicantUniversityId ?? null) as any,

        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: applications.id });

    // Backfill: upsert these fields into the student's profile so future applies auto-fill
    const backfill: Record<string, any> = {};
    const keys: (keyof AppBody)[] = [
      'whatsapp','province','cnic',
      'linkedinUrl','portfolioUrl','githubUrl',
      'workAuth','needSponsorship','willingRelocate',
      'remotePref','earliestStart',
      'salaryExpectation','expectedSalaryPkr',
      'noticePeriodDays','experienceYears',
    ];
    for (const k of keys) {
      const v = merged[k];
      if (v !== undefined && v !== null && v !== '') {
        switch (k) {
          case 'experienceYears': backfill.experienceYears = Number(v); break;
          case 'expectedSalaryPkr': backfill.expectedSalaryPkr = Number(v); break;
          case 'noticePeriodDays': backfill.noticePeriodDays = Number(v); break;
          case 'needSponsorship':
          case 'willingRelocate':
            backfill[k] = v;
            break;
          default:
            backfill[k] = v;
        }
      }
    }

    if (Object.keys(backfill).length > 0) {
      if (profile) {
        await db.update(studentProfiles).set(backfill).where(eq(studentProfiles.userId, me.id));
      } else {
        await db.insert(studentProfiles).values({ userId: me.id, ...backfill });
      }
    }

    return NextResponse.json({ id: inserted.id });
  } catch (err) {
    console.error('[applications.POST]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
