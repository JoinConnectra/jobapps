// /src/app/dashboard/kpi/insights/_data.ts
// Data fetching functions for analytics dashboard

import { db } from "@/db";
import {
  applications,
  jobs,
  actions,
  aiAnalyses,
  scores,
  activity,
  usage,
  resumes,
  organizations,
  users,
} from "@/db/schema-pg";
import { eq, and, gte, lte, sql, ne, inArray, isNotNull, or } from "drizzle-orm";

export interface OverviewSnapshot {
  totalOpenJobs: number;
  totalApplicantsThisMonth: number;
  medianTimeToHire: number | null;
  offerAcceptanceRate: number;
  activeCandidates: number;
  funnelConversion: {
    applicants: number;
    interviewed: number;
    offers: number;
    hired: number;
    conversionPercent: number;
  };
  sourceBreakdown: Array<{ source: string; count: number }>;
  teamActivity: Array<{ userId: number; userName: string; count: number }>;
}

export interface PipelineFunnel {
  stageCounts: Array<{ stage: string; count: number }>;
  timeInStage: Array<{ stage: string; avgDays: number }>;
  bottlenecks: Array<{ stage: string; avgDays: number }>;
}

export interface SourceOfHire {
  applicantsBySource: Array<{ source: string; count: number }>;
  interviewRateBySource: Array<{ source: string; rate: number }>;
  hireRateBySource: Array<{ source: string; rate: number }>;
}

export interface JobPerformance {
  jobId: number;
  jobTitle: string;
  applicantsCount: number;
  qualifiedApplicantsPercent: number;
  avgMatchScore: number | null;
  timeToFill: number | null;
  offerAcceptance: number;
  skillsMatch: Array<{ skill: string; matchPercent: number }>;
}

export interface ApplicationsOverTime {
  date: string; // Format: "YYYY-MM-DD"
  total: number;
  byJob: Record<string, number>; // jobTitle -> count
}

export async function fetchOverviewSnapshot(
  orgId: number
): Promise<OverviewSnapshot> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Total open jobs (status can be 'open', 'published', or not 'draft'/'closed')
  const openJobsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(jobs)
    .where(
      and(
        eq(jobs.orgId, orgId),
        or(
          eq(jobs.status, "open"),
          eq(jobs.status, "published"),
          eq(jobs.visibility, "public")
        )
      )
    );
  const openJobs = openJobsResult[0]?.count || 0;

  // Total applicants this month
  const applicantsThisMonthResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(
      and(
        eq(jobs.orgId, orgId),
        gte(applications.createdAt, startOfMonth)
      )
    );
  const applicantsThisMonth = applicantsThisMonthResult[0]?.count || 0;

  // Median time to hire (from application creation to offer_accepted action)
  const offerAcceptedActions = await db
    .select({
      applicationId: actions.applicationId,
      actionCreatedAt: actions.createdAt,
      applicationCreatedAt: applications.createdAt,
    })
    .from(actions)
    .innerJoin(applications, eq(actions.applicationId, applications.id))
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(
      and(
        eq(jobs.orgId, orgId),
        eq(actions.type, "offer_accepted")
      )
    );

  // Calculate time from application creation to offer acceptance
  const timeToHireValues: number[] = [];
  for (const action of offerAcceptedActions) {
    if (action.applicationCreatedAt && action.actionCreatedAt) {
      const days =
        (action.actionCreatedAt.getTime() - action.applicationCreatedAt.getTime()) /
        (1000 * 60 * 60 * 24);
      if (days >= 0) {
        timeToHireValues.push(days);
      }
    }
  }

  const medianTimeToHire =
    timeToHireValues.length > 0
      ? timeToHireValues.sort((a, b) => a - b)[
          Math.floor(timeToHireValues.length / 2)
        ]
      : null;

  // Offer acceptance rate
  const offersSentResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(actions)
    .innerJoin(applications, eq(actions.applicationId, applications.id))
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(
      and(
        eq(jobs.orgId, orgId),
        eq(actions.type, "offer_sent")
      )
    );
  const offersSent = offersSentResult[0]?.count || 0;

  const offersAccepted = offerAcceptedActions.length;
  const offerAcceptanceRate =
    offersSent > 0 ? (offersAccepted / offersSent) * 100 : 0;

  // Active candidates (not rejected, not hired)
  const activeCandidatesResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(
      and(
        eq(jobs.orgId, orgId),
        ne(applications.stage, "rejected"),
        ne(applications.stage, "hired")
      )
    );
  const activeCandidates = activeCandidatesResult[0]?.count || 0;

  // Funnel conversion
  const totalApplicantsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(eq(jobs.orgId, orgId));
  const totalApplicants = totalApplicantsResult[0]?.count || 0;

  const interviewedResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(actions)
    .innerJoin(applications, eq(actions.applicationId, applications.id))
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(
      and(
        eq(jobs.orgId, orgId),
        eq(actions.type, "interview_completed")
      )
    );
  const interviewed = interviewedResult[0]?.count || 0;

  const offers = offersSent;
  const hiredResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(
      and(
        eq(jobs.orgId, orgId),
        eq(applications.stage, "hired")
      )
    );
  const hired = hiredResult[0]?.count || 0;

  const funnelConversionPercent =
    totalApplicants > 0 ? (hired / totalApplicants) * 100 : 0;

  // Source breakdown - include null sources as "Unknown"
  const sourceBreakdownRaw = await db
    .select({
      source: sql<string>`COALESCE(${applications.source}, 'Unknown')`.as("source"),
      count: sql<number>`count(*)`.as("count"),
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(eq(jobs.orgId, orgId))
    .groupBy(sql`COALESCE(${applications.source}, 'Unknown')`)
    .orderBy(sql`count(*) desc`);

  const sourceBreakdown = sourceBreakdownRaw.map((r) => ({
    source: r.source || "Unknown",
    count: r.count,
  }));

  // Team activity
  const teamActivityRaw = await db
    .select({
      userId: activity.actorUserId,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(activity)
    .where(
      and(
        eq(activity.orgId, orgId),
        isNotNull(activity.actorUserId)
      )
    )
    .groupBy(activity.actorUserId)
    .orderBy(sql`count(*) desc`)
    .limit(10);

  // Get user names
  const userIds = teamActivityRaw
    .map((r) => r.userId)
    .filter((id): id is number => id !== null);
  const usersMap =
    userIds.length > 0
      ? await db
          .select({ id: users.id, name: users.name })
          .from(users)
          .where(inArray(users.id, userIds))
          .then((rows) => {
            const map = new Map<number, string>();
            for (const row of rows) {
              map.set(row.id, row.name);
            }
            return map;
          })
      : new Map<number, string>();

  const teamActivity = teamActivityRaw.map((r) => ({
    userId: r.userId!,
    userName: usersMap.get(r.userId!) || `User ${r.userId}`,
    count: r.count,
  }));

  return {
    totalOpenJobs: openJobs,
    totalApplicantsThisMonth: applicantsThisMonth,
    medianTimeToHire,
    offerAcceptanceRate,
    activeCandidates,
    funnelConversion: {
      applicants: totalApplicants,
      interviewed,
      offers,
      hired,
      conversionPercent: funnelConversionPercent,
    },
    sourceBreakdown: sourceBreakdown.map((r) => ({
      source: r.source || "Unknown",
      count: r.count,
    })),
    teamActivity,
  };
}

export async function fetchPipelineFunnel(
  orgId: number
): Promise<PipelineFunnel> {
  // Stage counts
  const stageCounts = await db
    .select({
      stage: applications.stage,
      count: sql<number>`count(*)`.as("count"),
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(eq(jobs.orgId, orgId))
    .groupBy(applications.stage)
    .orderBy(sql`count(*) desc`);

  // Time in stage (using actions to track transitions)
  // This is a simplified version - in production you'd track stage transitions more precisely
  const timeInStageRaw = await db
    .select({
      stage: applications.stage,
      avgDays: sql<number>`AVG(EXTRACT(EPOCH FROM (${applications.updatedAt} - ${applications.createdAt})) / 86400.0)`.as("avgDays"),
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(
      and(
        eq(jobs.orgId, orgId),
        ne(applications.stage, "applied")
      )
    )
    .groupBy(applications.stage);

  const timeInStage = timeInStageRaw.map((r) => ({
    stage: r.stage || "unknown",
    avgDays: Number(r.avgDays) || 0,
  }));

  // Bottlenecks (stages with longest avg time)
  const bottlenecks = [...timeInStage]
    .sort((a, b) => b.avgDays - a.avgDays)
    .slice(0, 5);

  return {
    stageCounts: stageCounts.map((r) => ({
      stage: r.stage || "unknown",
      count: r.count,
    })),
    timeInStage,
    bottlenecks,
  };
}

export async function fetchSourceOfHire(
  orgId: number
): Promise<SourceOfHire> {
  // Applicants by source - include null sources as "Unknown"
  const applicantsBySourceRaw = await db
    .select({
      source: sql<string>`COALESCE(${applications.source}, 'Unknown')`.as("source"),
      count: sql<number>`count(*)`.as("count"),
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(eq(jobs.orgId, orgId))
    .groupBy(sql`COALESCE(${applications.source}, 'Unknown')`)
    .orderBy(sql`count(*) desc`);

  const applicantsBySource = applicantsBySourceRaw.map((r) => ({
    source: r.source || "Unknown",
    count: r.count,
  }));

  // Interview rate per source
  const interviewActionsBySource = await db
    .select({
      source: sql<string>`COALESCE(${applications.source}, 'Unknown')`.as("source"),
      count: sql<number>`count(*)`.as("count"),
    })
    .from(actions)
    .innerJoin(applications, eq(actions.applicationId, applications.id))
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(
      and(
        eq(jobs.orgId, orgId),
        eq(actions.type, "interview_completed")
      )
    )
    .groupBy(sql`COALESCE(${applications.source}, 'Unknown')`);

  const interviewMap = new Map<string, number>();
  for (const item of interviewActionsBySource) {
    interviewMap.set(item.source || "Unknown", item.count);
  }

  const interviewRateBySource = applicantsBySource.map((r) => {
    const source = r.source || "Unknown";
    const interviewed = interviewMap.get(source) || 0;
    return {
      source,
      rate: r.count > 0 ? (interviewed / r.count) * 100 : 0,
    };
  });

  // Hire rate per source
  const hireActionsBySource = await db
    .select({
      source: sql<string>`COALESCE(${applications.source}, 'Unknown')`.as("source"),
      count: sql<number>`count(*)`.as("count"),
    })
    .from(actions)
    .innerJoin(applications, eq(actions.applicationId, applications.id))
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(
      and(
        eq(jobs.orgId, orgId),
        eq(actions.type, "offer_accepted")
      )
    )
    .groupBy(sql`COALESCE(${applications.source}, 'Unknown')`);

  const hireMap = new Map<string, number>();
  for (const item of hireActionsBySource) {
    hireMap.set(item.source || "Unknown", item.count);
  }

  const hireRateBySource = applicantsBySource.map((r) => {
    const source = r.source || "Unknown";
    const hired = hireMap.get(source) || 0;
    return {
      source,
      rate: r.count > 0 ? (hired / r.count) * 100 : 0,
    };
  });

  return {
    applicantsBySource: applicantsBySource.map((r) => ({
      source: r.source || "Unknown",
      count: r.count,
    })),
    interviewRateBySource,
    hireRateBySource,
  };
}

export async function fetchJobPerformance(
  orgId: number
): Promise<JobPerformance[]> {
  // Get all jobs for this org
  const orgJobs = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      createdAt: jobs.createdAt,
      skillsRequired: jobs.skillsRequired,
      seniority: jobs.seniority,
    })
    .from(jobs)
    .where(eq(jobs.orgId, orgId))
    .orderBy(sql`${jobs.createdAt} desc`);

  const jobPerformance: JobPerformance[] = [];

  for (const job of orgJobs) {
    // Applicants count
    const applicantsCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(applications)
      .where(eq(applications.jobId, job.id));
    const applicantsCount = applicantsCountResult[0]?.count || 0;

    // Qualified applicants (matchScore >= 60)
    const qualifiedCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(aiAnalyses)
      .innerJoin(applications, eq(aiAnalyses.applicationId, applications.id))
      .where(
        and(
          eq(applications.jobId, job.id),
          sql`${aiAnalyses.matchScore} >= 60`
        )
      );
    const qualifiedCount = qualifiedCountResult[0]?.count || 0;

    const qualifiedApplicantsPercent =
      applicantsCount > 0 ? (qualifiedCount / applicantsCount) * 100 : 0;

    // Average match score
    const avgMatchScoreResult = await db
      .select({
        avg: sql<number>`AVG(${aiAnalyses.matchScore})`.as("avg"),
      })
      .from(aiAnalyses)
      .innerJoin(applications, eq(aiAnalyses.applicationId, applications.id))
      .where(eq(applications.jobId, job.id));

    const avgMatchScore = avgMatchScoreResult[0]?.avg
      ? Number(avgMatchScoreResult[0].avg)
      : null;

    // Time to fill (first offer_accepted - job.createdAt)
    const firstOfferAcceptedResult = await db
      .select({ createdAt: actions.createdAt })
      .from(actions)
      .innerJoin(applications, eq(actions.applicationId, applications.id))
      .where(
        and(
          eq(applications.jobId, job.id),
          eq(actions.type, "offer_accepted")
        )
      )
      .orderBy(sql`${actions.createdAt} asc`)
      .limit(1);

    const firstOfferAccepted = firstOfferAcceptedResult[0];
    const timeToFill = firstOfferAccepted && job.createdAt
      ? (firstOfferAccepted.createdAt.getTime() - job.createdAt.getTime()) /
        (1000 * 60 * 60 * 24)
      : null;

    // Offer acceptance
    const offersSentResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(actions)
      .innerJoin(applications, eq(actions.applicationId, applications.id))
      .where(
        and(
          eq(applications.jobId, job.id),
          eq(actions.type, "offer_sent")
        )
      );
    const offersSent = offersSentResult[0]?.count || 0;

    const offersAcceptedResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(actions)
      .innerJoin(applications, eq(actions.applicationId, applications.id))
      .where(
        and(
          eq(applications.jobId, job.id),
          eq(actions.type, "offer_accepted")
        )
      );
    const offersAccepted = offersAcceptedResult[0]?.count || 0;

    const offerAcceptance =
      offersSent > 0 ? (offersAccepted / offersSent) * 100 : 0;

    // Skills match (simplified - would need to parse resumes.parsedJson)
    const skillsMatch: Array<{ skill: string; matchPercent: number }> = [];
    if (job.skillsRequired && Array.isArray(job.skillsRequired)) {
      for (const skill of job.skillsRequired) {
        // This is a placeholder - in production you'd match against resume skills
        skillsMatch.push({
          skill: String(skill),
          matchPercent: Math.random() * 100, // Placeholder
        });
      }
    }

    jobPerformance.push({
      jobId: job.id,
      jobTitle: job.title,
      applicantsCount,
      qualifiedApplicantsPercent,
      avgMatchScore,
      timeToFill,
      offerAcceptance,
      skillsMatch,
    });
  }

  return jobPerformance;
}

export async function fetchApplicationsOverTime(
  orgId: number,
  months: number = 6
): Promise<ApplicationsOverTime[]> {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() - months);

  // Get all applications with their job titles
  const applicationsWithJobs = await db
    .select({
      createdAt: applications.createdAt,
      jobTitle: jobs.title,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(
      and(
        eq(jobs.orgId, orgId),
        gte(applications.createdAt, startDate)
      )
    )
    .orderBy(applications.createdAt);

  // Group by date (day level)
  const dateMap = new Map<string, { total: number; byJob: Record<string, number> }>();

  for (const app of applicationsWithJobs) {
    const dateStr = app.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
    const jobTitle = app.jobTitle || "Unknown";

    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, { total: 0, byJob: {} });
    }

    const dayData = dateMap.get(dateStr)!;
    dayData.total += 1;
    dayData.byJob[jobTitle] = (dayData.byJob[jobTitle] || 0) + 1;
  }

  // Convert to array and sort by date
  const result: ApplicationsOverTime[] = Array.from(dateMap.entries())
    .map(([date, data]) => ({
      date,
      total: data.total,
      byJob: data.byJob,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return result;
}

