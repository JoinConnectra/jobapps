"use client";

import React, { useEffect, useState, useMemo } from "react";
import UniversityDashboardShell from "@/components/university/UniversityDashboardShell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type ApplicationsByMonthPoint = {
  month: string; // "2025-01"
  count: number;
};

type JobsByStatusPoint = {
  status: string;
  count: number;
};

type StudentsByGradYearPoint = {
  gradYear: number | null;
  label: string;
  count: number;
};

type StudentsByProgramPoint = {
  program: string | null;
  label: string;
  count: number;
};

type AnalyticsSummary = {
  totalStudents: number;
  studentsWithResume: number;
  applicationsLast30: number;
  uniqueApplicantsLast30: number;
  openJobsTargetingUni: number;
};

type UniversityAnalyticsResponse = {
  summary: AnalyticsSummary;
  applicationsByMonth: ApplicationsByMonthPoint[];
  jobsByStatus: JobsByStatusPoint[];
  studentsByGradYear: StudentsByGradYearPoint[];
  studentsByProgram: StudentsByProgramPoint[];
};

type OrgSummary = {
  id: number;
  name: string;
  type?: string;
};

type TimeRange = "3m" | "6m" | "12m";

// Brand palette – keep your green and soft neutrals
const PRIMARY = "#16a34a"; // main green
const PRIMARY_SOFT = "#bbf7d0";
const PRIMARY_DARK = "#166534";
const NEUTRAL_BORDER = "#e5e7eb";
const NEUTRAL_GRID = "#e5e7eb";
const NEUTRAL_TICK = "#6b7280";

// For jobs donut
const JOB_STATUS_COLORS = [
  "#16a34a",
  "#22c55e",
  "#4ade80",
  "#a3e635",
  "#bbf7d0",
];

export default function UniversityKpiPage() {
  const [org, setOrg] = useState<OrgSummary | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [analytics, setAnalytics] =
    useState<UniversityAnalyticsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("6m");

  // 1) Resolve university org
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setOrgLoading(true);
        const resp = await fetch("/api/organizations?mine=true");
        if (!resp.ok) {
          throw new Error(`Failed to load organizations: ${resp.status}`);
        }
        const orgs = await resp.json();
        const uni = Array.isArray(orgs)
          ? orgs.find((o: any) => o.type === "university")
          : null;

        if (!cancelled) {
          if (uni) {
            setOrg({ id: uni.id, name: uni.name, type: uni.type });
          } else {
            setError("No university organization found for this user.");
          }
        }
      } catch (err) {
        console.error("Error resolving university org:", err);
        if (!cancelled)
          setError("Unable to resolve your university organization.");
      } finally {
        if (!cancelled) setOrgLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // 2) Load analytics
  useEffect(() => {
    if (!org?.id) return;

    let cancelled = false;
    setAnalyticsLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(`/api/university/analytics?orgId=${org.id}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        const json = (await res.json()) as UniversityAnalyticsResponse;
        if (!cancelled) {
          setAnalytics(json);
        }
      } catch (err) {
        console.error("Error loading university analytics:", err);
        if (!cancelled) {
          setError("Unable to load analytics for your university.");
        }
      } finally {
        if (!cancelled) setAnalyticsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [org?.id]);

  const showSkeleton = orgLoading || (analyticsLoading && !analytics);

  // --------- DERIVED METRICS & TRANSFORMS ---------

  const derived = useMemo(() => {
    if (!analytics) {
      return {
        resumeCompletionRate: 0,
        engagedStudentRate: 0,
        applicationsPerEngagedStudent: 0,
      };
    }

    const { summary } = analytics;
    const totalStudents = summary.totalStudents || 0;
    const withResume = summary.studentsWithResume || 0;
    const uniqueApplicants = summary.uniqueApplicantsLast30 || 0;
    const applicationsLast30 = summary.applicationsLast30 || 0;

    const resumeCompletionRate =
      totalStudents > 0 ? (withResume / totalStudents) * 100 : 0;
    const engagedStudentRate =
      totalStudents > 0 ? (uniqueApplicants / totalStudents) * 100 : 0;
    const applicationsPerEngagedStudent =
      uniqueApplicants > 0 ? applicationsLast30 / uniqueApplicants : 0;

    return {
      resumeCompletionRate,
      engagedStudentRate,
      applicationsPerEngagedStudent,
    };
  }, [analytics]);

  // Time-filtered applications
  const filteredApplicationsByMonth = useMemo(() => {
    if (!analytics) return [];
    const months = analytics.applicationsByMonth;
    const maxPoints = timeRange === "3m" ? 3 : timeRange === "6m" ? 6 : 12;
    if (months.length <= maxPoints) return months;
    return months.slice(months.length - maxPoints);
  }, [analytics, timeRange]);

  // Top programs (by student count)
  const topPrograms = useMemo(() => {
    if (!analytics) return [];
    const sorted = [...analytics.studentsByProgram].sort(
      (a, b) => b.count - a.count,
    );
    return sorted.slice(0, 8);
  }, [analytics]);

  // Radial data: use % values so it feels like a gauge
  const radialReadinessData = useMemo(() => {
    if (!analytics) return [];
    const { resumeCompletionRate } = derived;
    return [
      {
        name: "Resume-ready %",
        value: Math.round(resumeCompletionRate * 10) / 10,
        fill: PRIMARY,
      },
    ];
  }, [analytics, derived]);

  const radialEngagementData = useMemo(() => {
    if (!analytics) return [];
    const { engagedStudentRate } = derived;
    return [
      {
        name: "Active last 30d %",
        value: Math.round(engagedStudentRate * 10) / 10,
        fill: PRIMARY_DARK,
      },
    ];
  }, [analytics, derived]);

  // Helpers
  const formatPercent = (n: number) =>
    `${Math.round((n + Number.EPSILON) * 10) / 10}%`;

  const formatNumber = (n: number) =>
    n.toLocaleString(undefined, { maximumFractionDigits: 1 });

  const formatMonthLabel = (ym: string) => {
    const dt = new Date(`${ym}-01T00:00:00`);
    if (Number.isNaN(dt.getTime())) return ym;
    return dt.toLocaleString(undefined, { month: "short", year: "2-digit" });
  };

  // --------- MAIN CONTENT ---------

  const content = (() => {
    if (showSkeleton) {
      return (
        <div className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-3 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <Skeleton className="h-3 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-3 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-3 w-28" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-72 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-3 w-28" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-72 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-600">{error}</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (!analytics) {
      return (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No analytics data available yet.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    const { summary, jobsByStatus, studentsByGradYear } = analytics;
    const {
      resumeCompletionRate,
      engagedStudentRate,
      applicationsPerEngagedStudent,
    } = derived;

    const hasApps = analytics.applicationsByMonth.length > 0;
    const hasJobsStatus = jobsByStatus.length > 0;
    const hasGradYears = studentsByGradYear.length > 0;
    const hasPrograms = topPrograms.length > 0;
    const hasReadiness = radialReadinessData.length > 0;
    const hasEngagement = radialEngagementData.length > 0;

    return (
      <div className="mt-6 space-y-8">
        {/* TOP KPI STRIP – very minimal, big numbers */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card className="border border-[rgba(22,101,52,0.06)] bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-[11px] font-medium text-muted-foreground">
                Students on Upstride
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">
                {formatNumber(summary.totalStudents)}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-[rgba(22,101,52,0.06)] bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-[11px] font-medium text-muted-foreground">
                Resume-ready
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight text-emerald-700">
                {formatPercent(resumeCompletionRate)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {formatNumber(summary.studentsWithResume)} students
              </div>
            </CardContent>
          </Card>

          <Card className="border border-[rgba(22,101,52,0.06)] bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-[11px] font-medium text-muted-foreground">
                Active last 30 days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight text-emerald-700">
                {formatPercent(engagedStudentRate)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {formatNumber(summary.uniqueApplicantsLast30)} students
              </div>
            </CardContent>
          </Card>

          <Card className="border border-[rgba(22,101,52,0.06)] bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-[11px] font-medium text-muted-foreground">
                Apps / active student
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">
                {formatNumber(applicationsPerEngagedStudent || 0)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                last 30 days
              </div>
            </CardContent>
          </Card>

          <Card className="border border-[rgba(22,101,52,0.06)] bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-[11px] font-medium text-muted-foreground">
                Open jobs targeting you
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">
                {formatNumber(summary.openJobsTargetingUni)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ROW 2 – Applications trend + radial gauges for readiness/engagement */}
        <div className="grid gap-4 xl:grid-cols-3">
          {/* Applications over time */}
          <Card className="xl:col-span-2 border border-[rgba(22,101,52,0.06)] bg-white/80">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold text-slate-900">
                Applications over time
              </CardTitle>
              <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-1 py-0.5">
                {(["3m", "6m", "12m"] as TimeRange[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTimeRange(r)}
                    className={`px-2 py-0.5 text-[11px] rounded-full ${
                      timeRange === r
                        ? "bg-white shadow-sm text-slate-900"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    {r === "3m"
                      ? "3 mo"
                      : r === "6m"
                      ? "6 mo"
                      : "12 mo"}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="h-72">
              {hasApps ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={filteredApplicationsByMonth}
                    margin={{ top: 10, left: 0, right: 10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="appsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor={PRIMARY}
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="100%"
                          stopColor={PRIMARY}
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={NEUTRAL_GRID}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tickFormatter={formatMonthLabel}
                      tick={{ fontSize: 11, fill: NEUTRAL_TICK }}
                      tickMargin={8}
                      axisLine={{ stroke: NEUTRAL_BORDER }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: NEUTRAL_TICK }}
                      axisLine={{ stroke: NEUTRAL_BORDER }}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        borderColor: NEUTRAL_BORDER,
                      }}
                      formatter={(value: any) => [
                        `${value} applications`,
                        "Count",
                      ]}
                      labelFormatter={(label) =>
                        `Month: ${formatMonthLabel(label)}`
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke={PRIMARY_DARK}
                      strokeWidth={2}
                      fill="url(#appsGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No applications recorded yet.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Radial gauges: readiness & engagement */}
          <Card className="border border-[rgba(22,101,52,0.06)] bg-white/80">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-900">
                Student readiness & engagement
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72 flex flex-col gap-4">
              {hasReadiness || hasEngagement ? (
                <div className="flex flex-1 gap-4">
                  {/* Resume readiness gauge */}
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="text-[11px] text-muted-foreground mb-1">
                      Resume-ready
                    </div>
                    <ResponsiveContainer width="100%" height="80%">
                      <RadialBarChart
                        innerRadius="70%"
                        outerRadius="100%"
                        data={radialReadinessData}
                        startAngle={180}
                        endAngle={0}
                      >
                        <RadialBar
                          dataKey="value"
                          cornerRadius={8}
                          
                          background={{ fill: NEUTRAL_BORDER }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={24}
                          formatter={(value: any) => (
                            <span className="text-[11px] text-slate-600">
                              {value}
                            </span>
                          )}
                        />
                        <Tooltip
                          contentStyle={{
                            fontSize: 11,
                            borderRadius: 8,
                            borderColor: NEUTRAL_BORDER,
                          }}
                          formatter={(v: any) => [`${v}%`, "Completion"]}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="mt-1 text-xs font-semibold text-emerald-700">
                      {formatPercent(resumeCompletionRate)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {formatNumber(summary.studentsWithResume)} students
                    </div>
                  </div>

                  {/* Engagement gauge */}
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="text-[11px] text-muted-foreground mb-1">
                      Active last 30 days
                    </div>
                    <ResponsiveContainer width="100%" height="80%">
                      <RadialBarChart
                        innerRadius="70%"
                        outerRadius="100%"
                        data={radialEngagementData}
                        startAngle={180}
                        endAngle={0}
                      >
                        <RadialBar
                          dataKey="value"
                          cornerRadius={8}
                          
                          background={{ fill: NEUTRAL_BORDER }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={24}
                          formatter={(value: any) => (
                            <span className="text-[11px] text-slate-600">
                              {value}
                            </span>
                          )}
                        />
                        <Tooltip
                          contentStyle={{
                            fontSize: 11,
                            borderRadius: 8,
                            borderColor: NEUTRAL_BORDER,
                          }}
                          formatter={(v: any) => [`${v}%`, "Engagement"]}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="mt-1 text-xs font-semibold text-emerald-700">
                      {formatPercent(engagedStudentRate)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {formatNumber(summary.uniqueApplicantsLast30)} students
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center">
                  Once students join and apply to roles, you’ll see readiness and
                  engagement gauges here.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ROW 3 – Jobs pipeline (donut) + cohort mix */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Jobs by status as donut pie chart */}
          <Card className="border border-[rgba(22,101,52,0.06)] bg-white/80 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-900">
                Jobs pipeline by status
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72 flex items-center justify-center">
              {hasJobsStatus ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={jobsByStatus}
                      dataKey="count"
                      nameKey="status"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {jobsByStatus.map((_, idx) => (
                        <Cell
                          key={idx}
                          fill={JOB_STATUS_COLORS[idx % JOB_STATUS_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        borderColor: NEUTRAL_BORDER,
                      }}
                      formatter={(value: any, name: any) => [
                        `${value} jobs`,
                        name,
                      ]}
                    />
                    <Legend
                      verticalAlign="bottom"
                      align="center"
                      formatter={(value: any) => (
                        <span className="text-[11px] text-slate-600">
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No jobs currently mapped to this university.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Cohort mix by graduation year */}
          <Card className="border border-[rgba(22,101,52,0.06)] bg-white/80">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-900">
                Students by graduation year
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {hasGradYears ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={studentsByGradYear}
                    margin={{ top: 10, left: 0, right: 10, bottom: 20 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={NEUTRAL_GRID}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: NEUTRAL_TICK }}
                      tickMargin={8}
                      axisLine={{ stroke: NEUTRAL_BORDER }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: NEUTRAL_TICK }}
                      axisLine={{ stroke: NEUTRAL_BORDER }}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        borderColor: NEUTRAL_BORDER,
                      }}
                      formatter={(value: any) => [
                        `${value} students`,
                        "Count",
                      ]}
                    />
                    <Bar
                      dataKey="count"
                      barSize={24}
                      radius={[6, 6, 2, 2]}
                      fill={PRIMARY_DARK}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Add graduation years to student profiles to visualize your
                  pipeline by cohort.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ROW 4 – Program mix (horizontal bars) */}
        <div>
          <Card className="border border-[rgba(22,101,52,0.06)] bg-white/80">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-900">
                Students by program / major (top 8)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              {hasPrograms ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topPrograms}
                    layout="vertical"
                    margin={{ top: 10, left: 80, right: 10, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={NEUTRAL_GRID}
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: NEUTRAL_TICK }}
                      axisLine={{ stroke: NEUTRAL_BORDER }}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      tick={{ fontSize: 11, fill: NEUTRAL_TICK }}
                      axisLine={{ stroke: NEUTRAL_BORDER }}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        borderColor: NEUTRAL_BORDER,
                      }}
                      formatter={(value: any) => [
                        `${value} students`,
                        "Count",
                      ]}
                    />
                    <Bar
                      dataKey="count"
                      barSize={20}
                      radius={[0, 6, 6, 0]}
                      fill={PRIMARY_SOFT}
                      stroke={PRIMARY_DARK}
                      strokeWidth={1}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-muted-foreground">
                  When students add their programs, you&apos;ll see which majors
                  dominate your Upstride population.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  })();

  return (
    <UniversityDashboardShell title="KPI & Analytics">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            A visual command center for{" "}
            <span className="font-medium">career services</span>.
          </p>
          {org?.name && (
            <p className="text-xs text-muted-foreground mt-1">
              University: <span className="font-medium">{org.name}</span>
            </p>
          )}
        </div>
      </div>
      {content}
    </UniversityDashboardShell>
  );
}
