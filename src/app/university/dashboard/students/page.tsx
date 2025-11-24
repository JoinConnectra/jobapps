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

export default function UniversityStudentsPage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<StudentItem[]>([]);

  const [programFilter, setProgramFilter] = useState<string>("all");
  const [gradYearFilter, setGradYearFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<
    "all" | "applied" | "noApps"
  >("all");

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

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
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
  }, [students, q, programFilter, gradYearFilter, activityFilter]);

  return (
    <UniversityDashboardShell title="Students">
      {/* Top row: breadcrumb + search */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-xs md:text-sm text-muted-foreground">
          <span className="font-medium">Dashboard</span>
          <span className="mx-1">›</span>
          <span>Students</span>
        </div>
        <div className="w-full max-w-xs md:ml-auto">
          <Input
            placeholder="Search by name, email, or program..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {/* Content card */}
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-base md:text-lg">Students</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              All students linked to this university, with application activity.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {students.length} total
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          {students.length > 0 && (
            <div className="mb-4 grid gap-2 md:grid-cols-3">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Program
                </span>
                <select
                  value={programFilter}
                  onChange={(e) => setProgramFilter(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                >
                  <option value="all">All programs</option>
                  {programOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Graduation year
                </span>
                <select
                  value={gradYearFilter}
                  onChange={(e) => setGradYearFilter(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                >
                  <option value="all">All years</option>
                  {gradYearOptions.map((y) => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Activity
                </span>
                <div className="inline-flex rounded-md border border-input bg-background p-0.5">
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
          )}

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No students found matching these filters yet.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map((s) => {
                const appsCount = Number(s.applicationsCount ?? 0);
                const lastActivity = s.lastApplicationAt
                  ? formatDateShort(s.lastApplicationAt)
                  : null;

                return (
                  <div
                    key={s.id}
                    className="flex flex-col md:flex-row md:items-center md:justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
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
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {s.email || "No email"}
                        {" • "}
                        {s.program || "Program not set"}
                        {s.gradYear ? ` • Class of ${s.gradYear}` : ""}
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
                        </div>
                      )}

                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {appsCount === 0 ? (
                          <>No applications yet</>
                        ) : (
                          <>
                            {appsCount} application
                            {appsCount !== 1 ? "s" : ""}{" "}
                            {lastActivity && <>• Last activity {lastActivity}</>}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 md:mt-0 flex items-center gap-3 text-xs">
                      {s.resumeUrl ? (
                        <a
                          href={s.resumeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline text-[#3d6a4a]"
                        >
                          View resume
                        </a>
                      ) : (
                        <span className="text-muted-foreground">
                          No resume uploaded
                        </span>
                      )}

                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/university/dashboard/students/${s.id}`}>
                          View
                        </Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </UniversityDashboardShell>
  );
}
