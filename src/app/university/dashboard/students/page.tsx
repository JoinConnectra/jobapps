// src/app/university/dashboard/students/page.tsx
"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import Link from "next/link";

import UniversityDashboardShell from "@/components/university/UniversityDashboardShell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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

  // New fields from API
  skills?: string[] | null;
  applicationsCount?: number | null;
  lastApplicationAt?: string | null;
};

type ActivityFilter = "all" | "applied" | "noApps";
type SortKey = "activityDesc" | "activityAsc" | "gradYearDesc" | "nameAsc";

function formatDateShort(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

function getEngagementStatus(
  applicationsCount: number,
  lastApplicationAt: string | null | undefined
): { label: string; tone: "active" | "dormant" | "none" } {
  if (applicationsCount <= 0) {
    return { label: "Not engaged yet", tone: "none" };
  }

  if (!lastApplicationAt) {
    return { label: "Some applications", tone: "none" };
  }

  const last = new Date(lastApplicationAt);
  if (Number.isNaN(last.getTime())) {
    return { label: "Some applications", tone: "none" };
  }

  const now = new Date();
  const diffDays =
    (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);

  if (diffDays <= 30) {
    return { label: "Active job seeker", tone: "active" };
  }
  if (diffDays > 90) {
    return { label: "Dormant", tone: "dormant" };
  }
  return { label: "Occasional activity", tone: "none" };
}

function getRiskLabel(
  gradYear: number | null,
  applicationsCount: number
): string | null {
  if (!gradYear) return null;
  const currentYear = new Date().getFullYear();
  if (gradYear !== currentYear) return null;

  if (applicationsCount === 0) return "At-risk";
  return "On track";
}

export default function UniversityStudentsPage() {
  const [orgId, setOrgId] = useState<number | null>(null);

  // Search: searchTerm is immediate input, q is debounced used in filters
  const [q, setQ] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<StudentItem[]>([]);

  const [programFilter, setProgramFilter] = useState<string>("all");
  const [gradYearFilter, setGradYearFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] =
    useState<ActivityFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("activityDesc");

  // Resolve the university orgId the same way as events: call /api/organizations?mine=true
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
      setStudents([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/university/students?orgId=${orgId}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error loading students", e);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    load();
  }, [orgId, load]);

  // Debounce searchTerm -> q
  useEffect(() => {
    const handle = setTimeout(() => {
      setQ(searchTerm);
    }, 200);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  const programOptions = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.program) set.add(s.program);
    });
    return Array.from(set).sort();
  }, [students]);

  const gradYearOptions = useMemo(() => {
    const set = new Set<number>();
    students.forEach((s) => {
      if (typeof s.gradYear === "number") set.add(s.gradYear);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [students]);

  // KPI stats for dashboard feel
  const studentStats = useMemo(() => {
    const currentYear = new Date().getFullYear();

    let finalYear = 0;
    let withResume = 0;
    let activeLast30 = 0;
    let atRiskFinalYear = 0;

    const now = new Date().getTime();

    students.forEach((s) => {
      const appsCount = Number(s.applicationsCount ?? 0);

      if (s.gradYear === currentYear) {
        finalYear += 1;
        if (appsCount === 0) atRiskFinalYear += 1;
      }

      if (s.resumeUrl) withResume += 1;

      if (s.lastApplicationAt) {
        const t = new Date(s.lastApplicationAt).getTime();
        if (!Number.isNaN(t)) {
          const diffDays = (now - t) / (1000 * 60 * 60 * 24);
          if (diffDays <= 30) activeLast30 += 1;
        }
      }
    });

    return { finalYear, withResume, activeLast30, atRiskFinalYear };
  }, [students]);

  const filteredAndSortedStudents = useMemo(() => {
    const filtered = students.filter((s) => {
      const text = q.trim().toLowerCase();
      if (text) {
        const matchesText =
          (s.name && s.name.toLowerCase().includes(text)) ||
          (s.email && s.email.toLowerCase().includes(text)) ||
          (s.program && s.program.toLowerCase().includes(text));
        if (!matchesText) return false;
      }

      if (programFilter !== "all" && s.program !== programFilter) {
        return false;
      }

      if (
        gradYearFilter !== "all" &&
        String(s.gradYear ?? "") !== gradYearFilter
      ) {
        return false;
      }

      const appsCount = Number(s.applicationsCount ?? 0);
      if (activityFilter === "applied" && appsCount <= 0) {
        return false;
      }
      if (activityFilter === "noApps" && appsCount > 0) {
        return false;
      }

      return true;
    });

    // Sorting
    const currentYear = new Date().getFullYear();

    return filtered.slice().sort((a, b) => {
      const appsA = Number(a.applicationsCount ?? 0);
      const appsB = Number(b.applicationsCount ?? 0);

      const lastA = a.lastApplicationAt
        ? new Date(a.lastApplicationAt).getTime()
        : -Infinity;
      const lastB = b.lastApplicationAt
        ? new Date(b.lastApplicationAt).getTime()
        : -Infinity;

      const gradA = a.gradYear ?? 0;
      const gradB = b.gradYear ?? 0;

      const nameA = (a.name || a.email || "").toLowerCase();
      const nameB = (b.name || b.email || "").toLowerCase();

      switch (sortKey) {
        case "activityDesc":
          if (lastA !== lastB) return lastB - lastA;
          if (appsA !== appsB) return appsB - appsA;
          return nameA.localeCompare(nameB);
        case "activityAsc":
          if (lastA !== lastB) return lastA - lastB;
          if (appsA !== appsB) return appsA - appsB;
          return nameA.localeCompare(nameB);
        case "gradYearDesc": {
          // Final year & later grads first; if no gradYear, push down
          const isFinalA = gradA === currentYear;
          const isFinalB = gradB === currentYear;
          if (isFinalA !== isFinalB) return isFinalA ? -1 : 1;
          if (gradA !== gradB) return gradB - gradA;
          return nameA.localeCompare(nameB);
        }
        case "nameAsc":
        default:
          return nameA.localeCompare(nameB);
      }
    });
  }, [
    students,
    q,
    programFilter,
    gradYearFilter,
    activityFilter,
    sortKey,
  ]);

  const totalFiltered = filteredAndSortedStudents.length;

  const handleResetFilters = useCallback(() => {
    setProgramFilter("all");
    setGradYearFilter("all");
    setActivityFilter("all");
    setSearchTerm("");
    setQ("");
    setSortKey("activityDesc");
  }, []);

  const isActivitySort =
    sortKey === "activityDesc" || sortKey === "activityAsc";

  const activityArrow = sortKey === "activityDesc" ? "↓" : "↑";

  const handleActivitySortClick = () => {
    setSortKey((prev) =>
      prev === "activityDesc" ? "activityAsc" : "activityDesc"
    );
  };

  return (
    <UniversityDashboardShell title="Students">
      <div className="space-y-4">
        {/* Top row: breadcrumb + search (aligned with other main pages) */}
        <div className="mb-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-xs md:text-sm text-muted-foreground">
            <span className="font-medium">Dashboard</span>
            <span className="mx-1">›</span>
            <span>Students</span>
          </div>
          <div className="w-full max-w-xs md:ml-auto">
            <Input
              placeholder="Search by name, email, or program..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* KPI row (same style as jobs/events/apps KPIs, but slimmer height) */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-slate-200 shadow-sm bg-white py-2">
            <CardHeader className="pt-1 pb-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Total students
              </p>
            </CardHeader>
            <CardContent className="pt-0 pb-2">
              <p className="text-xl font-semibold text-slate-900">
                {students.length}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Linked to this university
              </p>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm bg-white py-2">
            <CardHeader className="pt-1 pb-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Final-year students
              </p>
            </CardHeader>
            <CardContent className="pt-0 pb-2">
              <p className="text-xl font-semibold text-slate-900">
                {studentStats.finalYear}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground text-[11px]">
                Graduating this year
              </p>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm bg-white py-2">
            <CardHeader className="pt-1 pb-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                With resumes
              </p>
            </CardHeader>
            <CardContent className="pt-0 pb-2">
              <p className="text-xl font-semibold text-slate-900">
                {studentStats.withResume}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Students who have uploaded a resume
              </p>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm bg-white py-2">
            <CardHeader className="pt-1 pb-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Active last 30 days
              </p>
            </CardHeader>
            <CardContent className="pt-0 pb-2">
              <p className="text-xl font-semibold text-slate-900">
                {studentStats.activeLast30}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                At-risk final-year:{" "}
                <span className="font-semibold">
                  {studentStats.atRiskFinalYear}
                </span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Content card */}
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base md:text-lg text-slate-900">
                Students
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                All students linked to this university, with application
                activity and simple risk signals.
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
                  {students.length}
                </span>{" "}
                students.
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-3 text-[11px]"
                onClick={handleResetFilters}
              >
                Clear filters
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {/* Filters block (same layout style as jobs/applications/events) */}
            {students.length > 0 && (
              <div className="mb-4 rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm">
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
                      onClick={handleActivitySortClick}
                      className={`rounded-full border px-3 py-1 ${
                        isActivitySort
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      Last activity
                      {isActivitySort ? ` ${activityArrow}` : ""}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortKey("gradYearDesc")}
                      className={`rounded-full border px-3 py-1 ${
                        sortKey === "gradYearDesc"
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      Graduation year
                      {sortKey === "gradYearDesc" ? " •" : ""}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortKey("nameAsc")}
                      className={`rounded-full border px-3 py-1 ${
                        sortKey === "nameAsc"
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      Name A–Z
                      {sortKey === "nameAsc" ? " •" : ""}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-3">
                  {/* Program */}
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] text-muted-foreground">
                      Program
                    </Label>
                    <select
                      value={programFilter}
                      onChange={(e) => setProgramFilter(e.target.value)}
                      className="h-9 w-full rounded-md border border-slate-200 bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
                    >
                      <option value="all">All programs</option>
                      {programOptions.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Graduation year */}
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] text-muted-foreground">
                      Graduation year
                    </Label>
                    <select
                      value={gradYearFilter}
                      onChange={(e) => setGradYearFilter(e.target.value)}
                      className="h-9 w-full rounded-md border border-slate-200 bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
                    >
                      <option value="all">All years</option>
                      {gradYearOptions.map((y) => (
                        <option key={y} value={String(y)}>
                          {y}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Activity */}
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] text-muted-foreground">
                      Activity
                    </Label>
                    <div className="inline-flex rounded-md border border-slate-200 bg-background p-0.5 w-full">
                      <button
                        type="button"
                        onClick={() => setActivityFilter("all")}
                        className={`flex-1 rounded-sm px-2 py-1 text-[11px] ${
                          activityFilter === "all"
                            ? "bg-muted font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivityFilter("applied")}
                        className={`flex-1 rounded-sm px-2 py-1 text-[11px] ${
                          activityFilter === "applied"
                            ? "bg-muted font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        Has applied
                      </button>
                      <button
                        type="button"
                        onClick={() => setActivityFilter("noApps")}
                        className={`flex-1 rounded-sm px-2 py-1 text-[11px] ${
                          activityFilter === "noApps"
                            ? "bg-muted font-medium"
                            : "text-muted-foreground"
                        }`}
                      >
                        No applications
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* List / loading / empty states */}
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : totalFiltered === 0 ? (
              <div className="py-10 text-center border border-dashed border-muted rounded-md">
                <p className="text-sm font-medium text-foreground">
                  No students match your current filters.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try clearing filters or searching by a different name,
                  program, or class year.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 text-xs"
                  onClick={handleResetFilters}
                >
                  Reset filters
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAndSortedStudents.map((s) => {
                  const appsCount = Number(s.applicationsCount ?? 0);
                  const lastActivity = s.lastApplicationAt
                    ? formatDateShort(s.lastApplicationAt)
                    : null;
                  const engagement = getEngagementStatus(
                    appsCount,
                    s.lastApplicationAt
                  );
                  const riskLabel = getRiskLabel(
                    s.gradYear,
                    appsCount
                  );

                  const currentYear = new Date().getFullYear();
                  const isFinalYear = s.gradYear === currentYear;
                  const noResume = !s.resumeUrl;

                  return (
                    <Link
                      key={s.id}
                      href={`/university/dashboard/students/${s.id}`}
                      className="block"
                    >
                      <div
                        className={`flex flex-col md:flex-row md:items-center md:justify-between rounded-md border bg-white px-3 py-2 text-sm transition hover:border-[#3d6a4a]/60 hover:shadow-sm cursor-pointer ${
                          isFinalYear
                            ? "border-[#3d6a4a]/40 bg-[#f7faf8]"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="flex flex-1 gap-3">
                          {/* Avatar */}
                          <div className="mt-0.5 hidden h-8 w-8 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground md:flex">
                            {getInitials(s.name)}
                          </div>

                          <div className="flex flex-col">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">
                                {s.name || "Unnamed student"}
                              </span>
                              {s.verified && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] uppercase tracking-wide"
                                >
                                  Verified
                                </Badge>
                              )}
                              {riskLabel && (
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] uppercase tracking-wide ${
                                    riskLabel === "At-risk"
                                      ? "border-red-300 text-red-700"
                                      : "border-emerald-300 text-emerald-700"
                                  }`}
                                >
                                  {riskLabel}
                                </Badge>
                              )}
                            </div>

                            <div className="text-xs text-muted-foreground mt-1">
                              {s.email || "No email"}
                              {" • "}
                              {s.program || "Program not set"}
                              {s.gradYear
                                ? ` • Class of ${s.gradYear}`
                                : ""}
                            </div>

                            {s.skills && s.skills.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {s.skills.slice(0, 4).map((skill) => (
                                  <Badge
                                    key={skill}
                                    variant="outline"
                                    className="text-[10px]"
                                  >
                                    {skill}
                                  </Badge>
                                ))}
                                {s.skills.length > 4 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    +{s.skills.length - 4} more
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="mt-1 text-[11px] text-muted-foreground flex flex-wrap items-center gap-1">
                              {appsCount === 0 ? (
                                <>No applications yet</>
                              ) : (
                                <>
                                  {appsCount} application
                                  {appsCount !== 1 ? "s" : ""}{" "}
                                  {lastActivity && (
                                    <>• Last activity {lastActivity}</>
                                  )}
                                </>
                              )}
                              <span className="mx-1">•</span>
                              <span
                                className={
                                  engagement.tone === "active"
                                    ? "text-[#3d6a4a] font-medium"
                                    : engagement.tone === "dormant"
                                    ? "text-amber-700"
                                    : ""
                                }
                              >
                                {engagement.label}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 md:mt-0 flex items-center gap-3 text-xs">
                          {s.resumeUrl ? (
                            <span className="underline text-[#3d6a4a]">
                              View resume
                            </span>
                          ) : (
                            <span
                              className={`text-muted-foreground ${
                                noResume ? "font-medium" : ""
                              }`}
                            >
                              No resume uploaded
                            </span>
                          )}

                          <span className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-[11px] text-slate-700 bg-slate-50">
                            View profile →
                          </span>
                        </div>
                      </div>
                    </Link>
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
