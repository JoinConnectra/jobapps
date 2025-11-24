// src/app/university/dashboard/jobs/page.tsx
"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";

import UniversityDashboardShell from "@/components/university/UniversityDashboardShell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type UniversityJobItem = {
  id: number;
  title: string | null;
  dept: string | null;
  status: string | null;
  visibility: string | null;
  locationMode: string | null;
  location: string | null;
  seniority: string | null;
  orgId: number | null;
  orgName: string | null;
  orgSlug: string | null;
  createdAt: string | null;
};

type StatusFilter = "all" | "published" | "draft" | "closed";
type LocationModeFilter = "all" | "onsite" | "remote" | "hybrid";
type TimeRange = "all" | "30" | "90" | "365";
type SortKey = "date" | "title" | "company";

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
}

function withinTimeRange(createdAt: string | null, range: TimeRange): boolean {
  if (range === "all") return true;
  if (!createdAt) return true;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return true;

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (range === "30") return diffDays <= 30;
  if (range === "90") return diffDays <= 90;
  if (range === "365") return diffDays <= 365;
  return true;
}

function normalizeStatus(status: string | null): StatusFilter {
  const s = (status || "").toLowerCase();
  if (!s) return "all";
  if (s.includes("publish")) return "published";
  if (s.includes("close")) return "closed";
  if (s.includes("draft")) return "draft";
  return "all";
}

function normalizeLocationMode(loc: string | null): LocationModeFilter {
  const s = (loc || "").toLowerCase();
  if (s.includes("remote")) return "remote";
  if (s.includes("hybrid")) return "hybrid";
  if (s.includes("onsite") || s.includes("on-site") || s.includes("office")) {
    return "onsite";
  }
  return "all";
}

function statusBadgeClass(status: string | null) {
  const key = normalizeStatus(status);
  if (key === "published") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }
  if (key === "closed") {
    return "border-red-100 bg-red-50 text-red-700";
  }
  if (key === "draft") {
    return "border-slate-200 bg-slate-50 text-slate-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function locationBadgeClass(loc: string | null) {
  const key = normalizeLocationMode(loc);
  if (key === "remote") {
    return "border-blue-100 bg-blue-50 text-blue-700";
  }
  if (key === "hybrid") {
    return "border-violet-100 bg-violet-50 text-violet-700";
  }
  if (key === "onsite") {
    return "border-amber-100 bg-amber-50 text-amber-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function UniversityJobsPage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<UniversityJobItem[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("published");
  const [locationFilter, setLocationFilter] =
    useState<LocationModeFilter>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Resolve the university orgId (same pattern as students/events)
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const resp = await fetch("/api/organizations?mine=true", {
          cache: "no-store",
        });
        if (!resp.ok) return;
        const orgs = await resp.json();
        const uni = Array.isArray(orgs)
          ? orgs.find((o: any) => o?.type === "university")
          : null;
        if (!cancelled && uni?.id) {
          setOrgId(Number(uni.id));
        }
      } catch (e) {
        console.error("Error loading organizations", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    if (!orgId) {
      setJobs([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("orgId", String(orgId));
      if (q.trim()) params.set("q", q.trim());

      const res = await fetch(`/api/university/jobs?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error loading university jobs", e);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, q]);

  useEffect(() => {
    if (!orgId) return;
    load();
  }, [orgId, load]);

  // Derived sets for filters
  const availableCompanies = useMemo(() => {
    const set = new Set<string>();
    for (const job of jobs) {
      if (job.orgName) set.add(job.orgName);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [jobs]);

  // KPIs
  const kpis = useMemo(() => {
    const totalJobs = jobs.length;
    const companies = new Set<string>();
    let remote = 0;
    let hybrid = 0;
    let onsite = 0;
    let postedLast30 = 0;

    const now = new Date();

    for (const job of jobs) {
      if (job.orgName) companies.add(job.orgName);

      const locKey = normalizeLocationMode(job.locationMode);
      if (locKey === "remote") remote += 1;
      else if (locKey === "hybrid") hybrid += 1;
      else if (locKey === "onsite") onsite += 1;

      if (job.createdAt) {
        const d = new Date(job.createdAt);
        if (!Number.isNaN(d.getTime())) {
          const diffDays =
            (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDays <= 30) postedLast30 += 1;
        }
      }
    }

    return {
      totalJobs,
      uniqueCompanies: companies.size,
      remote,
      hybrid,
      onsite,
      postedLast30,
    };
  }, [jobs]);

  // Filter + sort
  const filtered = useMemo(() => {
    const text = q.trim().toLowerCase();

    const data = jobs
      .filter((job) => {
        if (!withinTimeRange(job.createdAt, timeRange)) return false;

        if (statusFilter !== "all") {
          const key = normalizeStatus(job.status);
          if (key !== statusFilter) return false;
        }

        if (locationFilter !== "all") {
          const key = normalizeLocationMode(job.locationMode);
          if (key !== locationFilter) return false;
        }

        if (companyFilter !== "all") {
          const cn = job.orgName ?? "Unknown company";
          if (cn !== companyFilter) return false;
        }

        if (!text) return true;

        const haystack = `${job.title ?? ""} ${job.dept ?? ""} ${
          job.orgName ?? ""
        } ${job.location ?? ""} ${job.locationMode ?? ""}`.toLowerCase();
        return haystack.includes(text);
      })
      .sort((a, b) => {
        let cmp = 0;

        if (sortKey === "date") {
          const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          cmp = da - db;
        } else if (sortKey === "title") {
          const ta = a.title ?? "";
          const tb = b.title ?? "";
          cmp = ta.localeCompare(tb);
        } else if (sortKey === "company") {
          const ca = a.orgName ?? "";
          const cb = b.orgName ?? "";
          cmp = ca.localeCompare(cb);
        }

        return sortDirection === "asc" ? cmp : -cmp;
      });

    return data;
  }, [
    jobs,
    q,
    statusFilter,
    locationFilter,
    companyFilter,
    timeRange,
    sortKey,
    sortDirection,
  ]);

  const totalFiltered = filtered.length;

  const handleClearFilters = useCallback(() => {
    setStatusFilter("published");
    setLocationFilter("all");
    setCompanyFilter("all");
    setTimeRange("all");
    setQ("");
  }, []);

  const handleSortClick = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDirection === "asc" ? "↑" : "↓";
  };

  return (
    <UniversityDashboardShell title="Jobs">
      {/* Match the same vertical rhythm as the partners page */}
      <div className="space-y-4">
        {/* Top row: breadcrumb + search */}
        <div className="mb-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-xs md:text-sm text-muted-foreground">
            <span className="font-medium">Dashboard</span>
            <span className="mx-1">›</span>
            <span>Jobs</span>
          </div>
          <div className="w-full max-w-xs md:ml-auto">
            <Input
              placeholder="Search by title, company, or location..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {/* KPI row – slimmer height, consistent across all 4 cards */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-slate-200 shadow-sm bg-white py-2">
            <CardHeader className="pt-1 pb-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Total jobs
              </p>
            </CardHeader>
            <CardContent className="pt-0 pb-2">
              <p className="text-xl font-semibold text-slate-900">
                {kpis.totalJobs}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Published and targeted to your university
              </p>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm bg-white py-2">
            <CardHeader className="pt-1 pb-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Partner companies
              </p>
            </CardHeader>
            <CardContent className="pt-0 pb-2">
              <p className="text-xl font-semibold text-slate-900">
                {kpis.uniqueCompanies}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Distinct employers sharing jobs here
              </p>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm bg-white py-2">
            <CardHeader className="pt-1 pb-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Work modes
              </p>
            </CardHeader>
            <CardContent className="pt-0 pb-2 text-xs text-muted-foreground">
              <div className="text-xl font-semibold text-foreground">
                {kpis.remote + kpis.hybrid + kpis.onsite}
              </div>
              <p className="mt-0.5 text-[11px]">
                {kpis.remote} remote · {kpis.hybrid} hybrid · {kpis.onsite}{" "}
                onsite
              </p>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm bg-white py-2">
            <CardHeader className="pt-1 pb-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                New in last 30 days
              </p>
            </CardHeader>
            <CardContent className="pt-0 pb-2">
              <p className="text-xl font-semibold text-slate-900">
                {kpis.postedLast30}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Recently posted opportunities
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Content card – styled like main partner card */}
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base md:text-lg text-slate-900">
                Jobs for your students
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                All jobs that have been explicitly targeted to this university,
                with filters to help you understand coverage and gaps.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 text-xs text-muted-foreground">
              <div>
                Showing{" "}
                <span className="font-semibold">
                  {loading ? "…" : totalFiltered}
                </span>{" "}
                of{" "}
                <span className="font-semibold">
                  {kpis.totalJobs}
                </span>{" "}
                jobs.
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-3 text-[11px]"
                onClick={handleClearFilters}
              >
                Clear filters
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {/* Filter block */}
            <div className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm">
              <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Filters
                </span>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="font-medium uppercase tracking-wide">
                    Sort by
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSortClick("date")}
                    className={`rounded-full border px-3 py-1 ${
                      sortKey === "date"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    Date {sortArrow("date")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSortClick("title")}
                    className={`rounded-full border px-3 py-1 ${
                      sortKey === "title"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    Role {sortArrow("title")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSortClick("company")}
                    className={`rounded-full border px-3 py-1 ${
                      sortKey === "company"
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    Company {sortArrow("company")}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-4">
                {/* Status */}
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Status
                  </span>
                  <select
                    className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
                    value={statusFilter}
                    onChange={(e) =>
                      setStatusFilter(e.target.value as StatusFilter)
                    }
                  >
                    <option value="all">All statuses</option>
                    <option value="published">Published</option>
                    <option value="closed">Closed</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>

                {/* Location mode */}
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Work mode
                  </span>
                  <select
                    className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
                    value={locationFilter}
                    onChange={(e) =>
                      setLocationFilter(
                        e.target.value as LocationModeFilter,
                      )
                    }
                  >
                    <option value="all">All modes</option>
                    <option value="onsite">Onsite</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>

                {/* Company */}
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Company
                  </span>
                  <select
                    className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
                    value={companyFilter}
                    onChange={(e) => setCompanyFilter(e.target.value)}
                  >
                    <option value="all">All companies</option>
                    {availableCompanies.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Time range */}
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Posted
                  </span>
                  <select
                    className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
                    value={timeRange}
                    onChange={(e) =>
                      setTimeRange(e.target.value as TimeRange)
                    }
                  >
                    <option value="all">All time</option>
                    <option value="30">Last 30 days</option>
                    <option value="90">Last 90 days</option>
                    <option value="365">Last 12 months</option>
                  </select>
                </div>
              </div>
            </div>

            {/* List */}
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Loading jobs…
              </div>
            ) : totalFiltered === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No jobs match the current filters yet. Try clearing a filter or
                widening the date range.
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((job) => {
                  const statusKey = normalizeStatus(job.status);
                  const locationKey = normalizeLocationMode(
                    job.locationMode,
                  );

                  return (
                    <div
                      key={job.id}
                      className="flex flex-col gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm md:flex-row md:items-stretch md:justify-between"
                    >
                      <div className="flex flex-1 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/university/dashboard/jobs/${job.id}`}
                            className="font-medium text-slate-900 hover:underline"
                          >
                            {job.title || "Untitled job"}
                          </Link>
                          {job.status && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] uppercase tracking-wide ${statusBadgeClass(
                                job.status,
                              )}`}
                            >
                              {statusKey === "published"
                                ? "Published"
                                : statusKey === "closed"
                                ? "Closed"
                                : statusKey === "draft"
                                ? "Draft"
                                : job.status}
                            </Badge>
                          )}
                          {job.visibility && job.visibility !== "public" && (
                            <Badge
                              variant="outline"
                              className="border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-700"
                            >
                              {job.visibility}
                            </Badge>
                          )}
                          {job.locationMode && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] uppercase tracking-wide ${locationBadgeClass(
                                job.locationMode,
                              )}`}
                            >
                              {locationKey === "remote"
                                ? "Remote"
                                : locationKey === "hybrid"
                                ? "Hybrid"
                                : locationKey === "onsite"
                                ? "Onsite"
                                : job.locationMode}
                            </Badge>
                          )}
                          {job.seniority && (
                            <Badge
                              variant="outline"
                              className="border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-700"
                            >
                              {job.seniority}
                            </Badge>
                          )}
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {job.orgName || "Unknown company"}
                          {job.dept ? ` • ${job.dept}` : ""}
                          {job.location
                            ? ` • ${job.location}`
                            : job.locationMode
                            ? ` • ${job.locationMode}`
                            : ""}
                        </div>

                        <div className="text-[11px] text-muted-foreground">
                          Posted {formatDate(job.createdAt)}
                        </div>
                      </div>

                      <div className="mt-1 md:mt-0 flex items-center justify-end text-xs">
                        <Link
                          href={`/university/dashboard/jobs/${job.id}`}
                          className="rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-700 hover:bg-slate-50"
                        >
                          View details
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </UniversityDashboardShell>
  );
}
