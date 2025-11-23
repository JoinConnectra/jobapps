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

  // 3) Derived metrics

  const totalStudents = students.length;

  const totalPartners = useMemo(
    () =>
      partnerRequests.filter((r) => r.status === "approved").length,
    [partnerRequests],
  );

  const totalJobs = jobs.length;

  const applicationsLast30Days = useMemo(
    () =>
      applications.filter((app) =>
        isWithinLastDays(app.createdAt, 30),
      ).length,
    [applications],
  );

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

  const loading = loadingOrg || loadingData;

  // --------------------
  // Render
  // --------------------

  return (
    <UniversityDashboardShell title="Overview">
      <div className="space-y-6">
        {/* Welcome / intro */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold">
            Welcome to your University Portal
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            Track your students, partners, jobs, applications, and
            events in one place.
          </p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Students */}
          <MetricCard
            icon={<GraduationCap className="h-5 w-5 text-[#3d6a4a]" />}
            label="Students"
            value={totalStudents}
            loading={loading}
            href="/university/dashboard/students"
          />

          {/* Partners */}
          <MetricCard
            icon={<Building2 className="h-5 w-5 text-[#3d6a4a]" />}
            label="Approved partners"
            value={totalPartners}
            loading={loading}
            href="/university/dashboard/partners"
          />

          {/* Jobs */}
          <MetricCard
            icon={<Briefcase className="h-5 w-5 text-[#3d6a4a]" />}
            label="Active jobs"
            value={totalJobs}
            loading={loading}
            href="/university/dashboard/jobs"
          />

          {/* Applications (30d) */}
          <MetricCard
            icon={<FileText className="h-5 w-5 text-[#3d6a4a]" />}
            label="Applications (last 30 days)"
            value={applicationsLast30Days}
            loading={loading}
            href="/university/dashboard/applications"
          />
        </div>

        {/* Three columns: jobs, events, applications */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Recent jobs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Recent jobs
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
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
                  No jobs available yet. Once your partners post
                  roles targeting your university, they will show
                  here.
                </p>
              ) : (
                <div className="space-y-2 text-sm">
                  {recentJobs.map((job) => (
                    <div
                      key={job.id}
                      className="rounded-md border border-gray-200 bg-white px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium truncate">
                          {job.title || "Untitled job"}
                        </div>
                        {job.createdAt && (
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Upcoming events
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
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
                  No upcoming events. Create a new event or ask
                  partners to schedule sessions for your students.
                </p>
              ) : (
                <div className="space-y-2 text-sm">
                  {upcomingEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="rounded-md border border-gray-200 bg-white px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium truncate">
                          {ev.title}
                        </div>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap flex items-center gap-1">
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle className="text-sm font-semibold">
                  Recent applications
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
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
                  No applications recorded yet. As students start
                  applying to jobs via your platform, they’ll show
                  up here.
                </p>
              ) : (
                <div className="space-y-2 text-sm">
                  {recentApplications.map((app) => (
                    <div
                      key={app.id}
                      className="rounded-md border border-gray-200 bg-white px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium truncate">
                          {app.studentName || "Unnamed student"}
                        </div>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {formatDate(app.createdAt)}
                        </span>
                      </div>
                      <div className="mt-1 text-[12px] text-muted-foreground">
                        {app.jobTitle
                          ? `Applied for: ${app.jobTitle}`
                          : "Job title not available"}
                        {app.companyName ? ` @ ${app.companyName}` : ""}
                      </div>
                      {app.stage && (
                        <div className="mt-1">
                          <Badge
                            variant="outline"
                            className="text-[10px] uppercase tracking-wide"
                          >
                            {app.stage}
                          </Badge>
                        </div>
                      )}
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
  value,
  loading,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  loading: boolean;
  href?: string;
}) {
  const content = (
    <Card className="h-full">
      <CardContent className="p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="rounded-full bg-[#F5F1E8] p-2 flex items-center justify-center">
            {icon}
          </div>
        </div>
        <div className="mt-1">
          <p className="text-xs text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-6 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-semibold">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
