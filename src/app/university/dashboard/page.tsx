"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import UniversityDashboardShell from "@/components/university/UniversityDashboardShell";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

import {
  GraduationCap,
  Building2,
  Briefcase,
  FileText,
  CalendarDays,
  ArrowRight,
  AlertTriangle,
  Users,
} from "lucide-react";
import { EventItem } from "@/components/events/types";

// --------------------
// Types
// --------------------

type StudentItem = {
  id: number;
  userId: number;
  name: string | null;
  email: string | null;
  program: string | null;
  gradYear: number | null;
  verified: boolean | null;
  resumeUrl: string | null;
  createdAt: string | null;

  // extra fields from API (optional, but we can use if present)
  skills?: string[] | null;
  applicationsCount?: number | null;
  lastApplicationAt?: string | null;
};

type JobItem = {
  id: number;
  title: string | null;
  companyName: string | null;
  location?: string | null;
  createdAt?: string | null;
  status?: string | null;
};

type ApplicationItem = {
  id: number;
  jobId: number | null;
  stage: string | null;
  createdAt: string | null;

  studentName: string | null;
  studentEmail: string | null;
  program: string | null;
  gradYear: number | null;

  jobTitle: string | null;
  companyName: string | null;
};

type PartnerRequestItem = {
  id: number;
  companyOrgId: number;
  companyName: string | null;
  status: string; // "pending" | "approved" | "rejected"
};

// --------------------
// Helpers
// --------------------

function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function isWithinLastDays(iso: string | null | undefined, days: number) {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function getInitials(name: string | null): string {
  if (!name || !name.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (
    parts[0].charAt(0).toUpperCase() +
    parts[parts.length - 1].charAt(0).toUpperCase()
  );
}

// --------------------
// Page component
// --------------------

export default function UniversityDashboardPage() {
  const [orgId, setOrgId] = useState<number | null>(null);

  const [students, setStudents] = useState<StudentItem[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [partnerRequests, setPartnerRequests] = useState<PartnerRequestItem[]>(
    [],
  );

  const [loadingOrg, setLoadingOrg] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  // 1) Resolve university org id
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const resp = await fetch("/api/organizations?mine=true", {
          cache: "no-store",
        });
        if (!resp.ok) {
          return;
        }
        const orgs = await resp.json();
        const uni = Array.isArray(orgs)
          ? orgs.find((o: any) => o?.type === "university")
          : null;

        if (!cancelled && uni?.id) {
          setOrgId(Number(uni.id));
        }
      } catch (e) {
        console.error("Error loading organizations", e);
      } finally {
        if (!cancelled) setLoadingOrg(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // 2) Load overview data once orgId is known
  const loadOverview = useCallback(async () => {
    if (!orgId) {
      setStudents([]);
      setJobs([]);
      setApplications([]);
      setEvents([]);
      setPartnerRequests([]);
      return;
    }

    setLoadingData(true);
    try {
      const [
        studentsRes,
        jobsRes,
        appsRes,
        eventsRes,
        partnerReqRes,
      ] = await Promise.all([
        fetch(`/api/university/students?orgId=${orgId}`, {
          cache: "no-store",
        }),
        fetch(`/api/university/jobs?orgId=${orgId}`, {
          cache: "no-store",
        }),
        fetch(`/api/university/applications?orgId=${orgId}`, {
          cache: "no-store",
        }),
        fetch(`/api/university/events?orgId=${orgId}&status=upcoming`, {
          cache: "no-store",
        }),
        fetch(`/api/university/requests?orgId=${orgId}`, {
          cache: "no-store",
        }),
      ]);

      if (studentsRes.ok) {
        const data = await studentsRes.json();
        setStudents(Array.isArray(data) ? data : []);
      } else {
        setStudents([]);
      }

      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setJobs(Array.isArray(data) ? data : []);
      } else {
        setJobs([]);
      }

      if (appsRes.ok) {
        const data = await appsRes.json();
        setApplications(Array.isArray(data) ? data : []);
      } else {
        setApplications([]);
      }

      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(Array.isArray(data) ? data : []);
      } else {
        setEvents([]);
      }

      if (partnerReqRes.ok) {
        const data = await partnerReqRes.json();
        setPartnerRequests(Array.isArray(data) ? data : []);
      } else {
        setPartnerRequests([]);
      }
    } catch (e) {
      console.error("Error loading university overview", e);
      setStudents([]);
      setJobs([]);
      setApplications([]);
      setEvents([]);
      setPartnerRequests([]);
    } finally {
      setLoadingData(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    loadOverview();
  }, [orgId, loadOverview]);

  const loading = loadingOrg || loadingData;

  // 3) Derived metrics

  const totalStudents = students.length;

  const {
    finalYearStudents,
    atRiskFinalYear,
    studentsWithResume,
    activeStudentsLast30,
  } = useMemo(() => {
    const currentYear = new Date().getFullYear();
    let finalYear = 0;
    let atRisk = 0;
    let withResume = 0;
    let activeLast30 = 0;

    const nowMs = Date.now();

    students.forEach((s) => {
      const appsCount = Number(s.applicationsCount ?? 0);

      if (s.gradYear === currentYear) {
        finalYear += 1;
        if (appsCount === 0) {
          atRisk += 1;
        }
      }

      if (s.resumeUrl) withResume += 1;

      if (s.lastApplicationAt) {
        const t = new Date(s.lastApplicationAt).getTime();
        if (!Number.isNaN(t)) {
          const diffDays = (nowMs - t) / (1000 * 60 * 60 * 24);
          if (diffDays <= 30) activeLast30 += 1;
        }
      }
    });

    return {
      finalYearStudents: finalYear,
      atRiskFinalYear: atRisk,
      studentsWithResume: withResume,
      activeStudentsLast30: activeLast30,
    };
  }, [students]);

  const totalPartners = useMemo(
    () =>
      partnerRequests.filter((r) => r.status === "approved").length,
    [partnerRequests],
  );

  const pendingPartnerRequests = useMemo(
    () => partnerRequests.filter((r) => r.status === "pending"),
    [partnerRequests],
  );

  const totalJobs = jobs.length;

  const activeJobs = useMemo(
    () =>
      jobs.filter((j) => {
        const s = (j.status || "").toLowerCase();
        return !s.includes("closed");
      }).length,
    [jobs],
  );

  const applicationsLast30Days = useMemo(
    () =>
      applications.filter((app) =>
        isWithinLastDays(app.createdAt, 30),
      ).length,
    [applications],
  );

  const pipeline = useMemo(() => {
    let reviewing = 0;
    let interviewing = 0;
    let offers = 0;

    applications.forEach((app) => {
      const s = (app.stage || "").toLowerCase();
      if (!s) {
        reviewing += 1;
      } else if (s.includes("interview")) {
        interviewing += 1;
      } else if (s.includes("offer") || s.includes("hired")) {
        offers += 1;
      } else if (s.includes("screen")) {
        reviewing += 1;
      } else {
        reviewing += 1;
      }
    });

    return { reviewing, interviewing, offers };
  }, [applications]);

  const recentJobs = useMemo(() => {
    const sorted = [...jobs].sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });
    return sorted.slice(0, 5);
  }, [jobs]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    const sorted = [...events].sort((a, b) => {
      const da = new Date(a.startsAt).getTime();
      const db = new Date(b.startsAt).getTime();
      return da - db;
    });
    return sorted.filter((e) => new Date(e.startsAt) >= now).slice(0, 5);
  }, [events]);

  const recentApplications = useMemo(() => {
    const sorted = [...applications].sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return db - da;
    });
    return sorted.slice(0, 5);
  }, [applications]);

  const topAtRiskFinalYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return students
      .filter((s) => {
        const appsCount = Number(s.applicationsCount ?? 0);
        return s.gradYear === currentYear && appsCount === 0;
      })
      .slice(0, 4);
  }, [students]);

  // --------------------
  // Render
  // --------------------

  return (
    <UniversityDashboardShell title="Overview">
      <div className="space-y-6">
        {/* Top hero / summary — keep background/wording as is */}
        <Card className="border border-slate-200 bg-gradient-to-r from-[#F5F1E8] via-white to-[#F5F1E8]">
          <CardContent className="py-4 md:py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              University career overview
            </p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900 md:text-2xl">
              See how your students, partners, and jobs connect.
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Monitor student engagement, partner activity, and upcoming
              recruiting moments in a single, actionable view.
            </p>
          </CardContent>
        </Card>

        {/* KPI row – aligned with other uni pages */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={<GraduationCap className="h-5 w-5 text-[#3d6a4a]" />}
            label="Students in system"
            helper="Across all class years."
            value={totalStudents}
            loading={loading}
            href="/university/dashboard/students"
          />

          <MetricCard
            icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
            label="Final-year at risk"
            helper={
              finalYearStudents > 0
                ? `${atRiskFinalYear} of ${finalYearStudents} final-year students with no applications.`
                : "We’ll flag final-year students with low activity."
            }
            value={atRiskFinalYear}
            loading={loading}
            href="/university/dashboard/students"
          />

          <MetricCard
            icon={<Briefcase className="h-5 w-5 text-[#3d6a4a]" />}
            label="Active jobs"
            helper="Open roles targeted to your students."
            value={activeJobs || totalJobs}
            loading={loading}
            href="/university/dashboard/jobs"
          />

          <MetricCard
            icon={<FileText className="h-5 w-5 text-[#3d6a4a]" />}
            label="Applications (last 30 days)"
            helper="Recent activity across all jobs."
            value={applicationsLast30Days}
            loading={loading}
            href="/university/dashboard/applications"
          />
        </div>

        {/* Middle row: Student engagement + Pipeline + Partners */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Student engagement snapshot */}
          <Card className="lg:col-span-1 border border-slate-200 shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Student engagement
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Quick snapshot of how students are engaging with jobs.
                </p>
              </div>
              <Link
                href="/university/dashboard/students"
                className="inline-flex items-center text-xs text-[#3d6a4a]"
              >
                Open students
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ) : totalStudents === 0 ? (
                <p className="text-muted-foreground">
                  Once students join and start applying, you’ll see their
                  engagement summary here.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      With resumes uploaded
                    </span>
                    <span className="font-medium">
                      {studentsWithResume} / {totalStudents}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Active last 30 days
                    </span>
                    <span className="font-medium">
                      {activeStudentsLast30}
                    </span>
                  </div>
                  <div className="mt-2 border-t pt-2">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      At-risk final-year students
                    </p>
                    {topAtRiskFinalYears.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground">
                        No at-risk final-year students detected yet.
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {topAtRiskFinalYears.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center justify-between rounded-md border border-red-100 bg-red-50 px-2 py-1.5"
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-[10px] font-semibold text-red-800">
                                {getInitials(s.name)}
                              </div>
                              <div>
                                <p className="text-xs font-medium text-red-900">
                                  {s.name || "Unnamed student"}
                                </p>
                                <p className="text-[10px] text-red-800">
                                  {s.program || "Program not set"}
                                  {s.gradYear
                                    ? ` • Class of ${s.gradYear}`
                                    : ""}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className="border-red-200 bg-red-50 text-[10px] uppercase tracking-wide text-red-700"
                            >
                              No applications
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Applications pipeline snapshot */}
          <Card className="lg:col-span-1 border border-slate-200 shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Applications pipeline
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Where student applications are sitting today.
                </p>
              </div>
              <Link
                href="/university/dashboard/applications"
                className="inline-flex items-center text-xs text-[#3d6a4a]"
              >
                View pipeline
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ) : applications.length === 0 ? (
                <p className="text-muted-foreground">
                  No applications yet. As students apply and move through
                  stages, you’ll see their distribution here.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      In review / screening
                    </span>
                    <span className="font-medium">
                      {pipeline.reviewing}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Interviewing
                    </span>
                    <span className="font-medium">
                      {pipeline.interviewing}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Offers / hired
                    </span>
                    <span className="font-medium">
                      {pipeline.offers}
                    </span>
                  </div>
                  <div className="mt-3 rounded-md bg-slate-50 px-3 py-2 text-[11px] text-muted-foreground">
                    Total applications:{" "}
                    <span className="font-semibold">
                      {applications.length}
                    </span>
                    . Last 30 days:{" "}
                    <span className="font-semibold">
                      {applicationsLast30Days}
                    </span>
                    .
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Partner activity */}
          <Card className="lg:col-span-1 border border-slate-200 shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Employer partners
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Track partnerships and incoming requests.
                </p>
              </div>
              <Link
                href="/university/dashboard/partners"
                className="inline-flex items-center text-xs text-[#3d6a4a]"
              >
                Manage partners
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-40" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Approved partners
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <Building2 className="h-3.5 w-3.5 text-[#3d6a4a]" />
                      {totalPartners}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Pending requests
                    </span>
                    <span className="font-medium">
                      {pendingPartnerRequests.length}
                    </span>
                  </div>

                  {pendingPartnerRequests.length > 0 && (
                    <div className="mt-2 rounded-md border border-amber-100 bg-amber-50 px-3 py-2">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                        Pending approvals
                      </p>
                      <div className="space-y-1">
                        {pendingPartnerRequests.slice(0, 3).map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between text-[11px]"
                          >
                            <span className="truncate">
                              {r.companyName || "Unknown company"}
                            </span>
                            <Badge
                              variant="outline"
                              className="border-amber-200 bg-amber-50 text-[10px] uppercase tracking-wide text-amber-800"
                            >
                              Pending
                            </Badge>
                          </div>
                        ))}
                      </div>
                      {pendingPartnerRequests.length > 3 && (
                        <p className="mt-1 text-[10px] text-amber-800">
                          +{pendingPartnerRequests.length - 3} more
                        </p>
                      )}
                    </div>
                  )}
                  {pendingPartnerRequests.length === 0 && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      No pending partner requests right now.
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom row: jobs, events, applications */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Recent jobs */}
          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Recent jobs
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Latest roles targeted to your students.
                </p>
              </div>
              <Link
                href="/university/dashboard/jobs"
                className="inline-flex items-center text-xs text-[#3d6a4a]"
              >
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : recentJobs.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No jobs available yet. Once your partners post roles
                  targeting your university, they will show here.
                </p>
              ) : (
                <div className="space-y-2 text-sm">
                  {recentJobs.map((job) => (
                    <div
                      key={job.id}
                      className="rounded-md border border-slate-200 bg-white px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate font-medium text-slate-900">
                          {job.title || "Untitled job"}
                        </div>
                        {job.createdAt && (
                          <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                            {formatDate(job.createdAt)}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-[12px] text-muted-foreground">
                        {job.companyName || "Unknown company"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming events */}
          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Upcoming events
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Career fairs, info sessions, and employer events.
                </p>
              </div>
              <Link
                href="/university/dashboard/events"
                className="inline-flex items-center text-xs text-[#3d6a4a]"
              >
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : upcomingEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No upcoming events. Create a new event or ask partners
                  to schedule sessions for your students.
                </p>
              ) : (
                <div className="space-y-2 text-sm">
                  {upcomingEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-md border border-slate-200 bg-white px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate font-medium text-slate-900">
                          {ev.title}
                        </div>
                        <span className="flex items-center gap-1 whitespace-nowrap text-[11px] text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          {formatDateTime(ev.startsAt)}
                        </span>
                      </div>
                      <div className="mt-1 text-[12px] text-muted-foreground">
                        {ev.location || "Location TBA"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent applications */}
          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold text-slate-900">
                  Recent applications
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  What your students have applied to recently.
                </p>
              </div>
              <Link
                href="/university/dashboard/applications"
                className="inline-flex items-center text-xs text-[#3d6a4a]"
              >
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : recentApplications.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No applications recorded yet. As students start applying
                  to jobs via your platform, they’ll show up here.
                </p>
              ) : (
                <div className="space-y-2 text-sm">
                  {recentApplications.map((app) => (
                    <div
                      key={app.id}
                      className="rounded-md border border-slate-200 bg-white px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate font-medium text-slate-900">
                          {app.studentName || "Unnamed student"}
                        </div>
                        <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                          {formatDate(app.createdAt)}
                        </span>
                      </div>
                      <div className="mt-1 text-[12px] text-muted-foreground">
                        {app.jobTitle
                          ? `Applied for: ${app.jobTitle}`
                          : "Job title not available"}
                        {app.companyName ? ` @ ${app.companyName}` : ""}
                      </div>
                      <div className="mt-1 flex items-center justify-between">
                        {app.stage && (
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase tracking-wide"
                          >
                            {app.stage}
                          </Badge>
                        )}
                        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {app.program || "Program not set"}
                          {app.gradYear ? ` • ${app.gradYear}` : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </UniversityDashboardShell>
  );
}

// --------------------
// Metric card component
// --------------------

function MetricCard({
  icon,
  label,
  helper,
  value,
  loading,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  helper?: string;
  value: number;
  loading: boolean;
  href?: string;
}) {
  const inner = (
    <Card className="h-full border border-slate-200 shadow-sm bg-white transition hover:border-[#3d6a4a]/70 hover:shadow-md">
      <CardContent className="flex h-full flex-col gap-2 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-center rounded-full bg-[#F5F1E8] p-2">
            {icon}
          </div>
        </div>
        <div className="mt-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="mt-1 h-6 w-16" />
          ) : (
            <p className="text-2xl font-semibold text-slate-900">
              {value}
            </p>
          )}
          {helper && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              {helper}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }

  return inner;
}
