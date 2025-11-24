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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

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

type ViewMode = "list" | "by-company";
type TimeRange = "all" | "30" | "90" | "365";
type SortKey = "date" | "stage" | "company";

type StudentSummary = {
  id: number;
  name: string | null;
  email: string | null;
  program: string | null;
  gradYear: number | null;
  gpa: string | number | null;
  resumeUrl: string | null;
  skills: string[] | null;
  applicationsCount: number;
  activeApplications: number;
  lastApplicationAt: string | null;
  eventsRegistered: number;
  eventsAttended: number;
};

type PartnerSummary = {
  id: number;
  companyOrgId: number;
  companyName: string;
  status: string; // "approved" | "pending" | etc.
  industry?: string | null;
  websiteUrl?: string | null;
  aboutCompany?: string | null;
  jobsCount?: number | null;
  eventsCount?: number | null;
  applicationsCount?: number | null;
  priority?: string | null;
  lastInteractionAt?: string | null;
  lastMeetingDate?: string | null;
};

function getStageKey(stage: string | null): string {
  if (!stage) return "applied";
  const s = stage.trim().toLowerCase();
  if (!s) return "applied";
  if (s.includes("offer")) return "offer";
  if (s.includes("interview")) return "interview";
  if (s.includes("reject")) return "rejected";
  if (s.includes("screen")) return "interview";
  return s;
}

function prettyStage(stage: string | null) {
  const key = getStageKey(stage);
  if (key === "applied") return "Applied";
  if (key === "interview") return "Interview";
  if (key === "offer") return "Offer";
  if (key === "rejected") return "Rejected";
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function stageBadgeClass(stage: string | null) {
  const key = getStageKey(stage);
  if (key === "offer") {
    return "border-green-100 bg-green-50 text-green-700";
  }
  if (key === "interview") {
    return "border-blue-100 bg-blue-50 text-blue-700";
  }
  if (key === "rejected") {
    return "border-red-100 bg-red-50 text-red-700";
  }
  return "border-gray-200 bg-gray-50 text-gray-700";
}

function formatDate(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
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

type StageTimelineProps = {
  stage: string | null;
};

function StageTimeline({ stage }: StageTimelineProps) {
  const key = getStageKey(stage);

  const appliedActive = true;
  const interviewActive = key === "interview" || key === "offer" || key === "rejected";
  const isOffer = key === "offer";
  const isRejected = key === "rejected";

  const finalLabel = isRejected ? "Rejected" : "Offer";
  const finalActive = isOffer || isRejected;

  const dotBase = "h-2 w-2 rounded-full border transition";
  const lineBase = "h-px flex-1 bg-slate-200";

  return (
    <div className="mt-2 flex flex-col gap-1 text-[11px] text-muted-foreground">
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-center gap-1">
          <div
            className={`${dotBase} ${
              appliedActive
                ? "border-slate-900 bg-slate-900"
                : "border-slate-300 bg-white"
            }`}
          />
          <span className="text-[10px]">Applied</span>
        </div>

        <div className={lineBase} />

        <div className="flex flex-col items-center gap-1">
          <div
            className={`${dotBase} ${
              interviewActive
                ? "border-blue-600 bg-blue-600"
                : "border-slate-300 bg-white"
            }`}
          />
          <span className="text-[10px]">Interview</span>
        </div>

        <div className={lineBase} />

        <div className="flex flex-col items-center gap-1">
          <div
            className={`${dotBase} ${
              finalActive
                ? isRejected
                  ? "border-red-600 bg-red-600"
                  : "border-emerald-600 bg-emerald-600"
                : "border-slate-300 bg-white"
            }`}
          />
          <span className="text-[10px]">
            {finalLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function UniversityApplicationsPage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ApplicationItem[]>([]);

  // Filters
  const [stageFilter, setStageFilter] = useState<
    "all" | "applied" | "interview" | "offer" | "rejected"
  >("all");
  const [programFilter, setProgramFilter] = useState<string>("all");
  const [gradYearFilter, setGradYearFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Student side sheet
  const [activeStudent, setActiveStudent] = useState<ApplicationItem | null>(
    null,
  );
  const [studentSummary, setStudentSummary] = useState<StudentSummary | null>(
    null,
  );
  const [studentSummaryLoading, setStudentSummaryLoading] = useState(false);
  const [studentSummaryError, setStudentSummaryError] = useState<string | null>(
    null,
  );

  // Company / partner CRM sheet
  const [activeCompanyName, setActiveCompanyName] = useState<string | null>(
    null,
  );
  const [partnerSummary, setPartnerSummary] = useState<PartnerSummary | null>(
    null,
  );
  const [partnerLoading, setPartnerLoading] = useState(false);
  const [partnerError, setPartnerError] = useState<string | null>(null);

  const handleSortClick = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  // Resolve the university orgId
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
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/university/applications?orgId=${orgId}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error loading applications", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    load();
  }, [orgId, load]);

  // Load student summary when student sheet opens
  useEffect(() => {
    const email = activeStudent?.studentEmail;
    if (!email) {
      setStudentSummary(null);
      setStudentSummaryError(null);
      setStudentSummaryLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setStudentSummaryLoading(true);
        setStudentSummaryError(null);
        const res = await fetch(
          `/api/university/students/summary?email=${encodeURIComponent(
            email,
          )}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          throw new Error("Failed to load student summary");
        }
        const data: StudentSummary = await res.json();
        if (!cancelled) {
          setStudentSummary(data);
        }
      } catch (e: any) {
        console.error("Error loading student summary", e);
        if (!cancelled) {
          setStudentSummary(null);
          setStudentSummaryError(
            e?.message || "Could not load student summary.",
          );
        }
      } finally {
        if (!cancelled) {
          setStudentSummaryLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeStudent?.studentEmail]);

  // Load partner summary when partner sheet opens
  // ✅ now includes universityOrgId when available
  useEffect(() => {
    const companyName = activeCompanyName;
    if (!companyName) {
      setPartnerSummary(null);
      setPartnerError(null);
      setPartnerLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setPartnerLoading(true);
        setPartnerError(null);

        let url = `/api/university/partners/summary?companyName=${encodeURIComponent(
          companyName,
        )}`;
        if (orgId) {
          url += `&universityOrgId=${orgId}`;
        }

        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          throw new Error("Failed to load partner summary");
        }
        const data: PartnerSummary = await res.json();
        if (!cancelled) {
          setPartnerSummary(data);
        }
      } catch (e: any) {
        console.error("Error loading partner summary", e);
        if (!cancelled) {
          setPartnerSummary(null);
          setPartnerError(
            e?.message || "Could not load partner summary.",
          );
        }
      } finally {
        if (!cancelled) {
          setPartnerLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeCompanyName, orgId]);

  // Derived filter option sets
  const availablePrograms = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.program) {
        set.add(item.program);
      }
    }
    return Array.from(set).sort();
  }, [items]);

  const availableGradYears = useMemo(() => {
    const set = new Set<number>();
    for (const item of items) {
      if (typeof item.gradYear === "number") {
        set.add(item.gradYear);
      }
    }
    return Array.from(set).sort((a, b) => a - b);
  }, [items]);

  const availableCompanies = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.companyName) {
        set.add(item.companyName);
      }
    }
    return Array.from(set).sort();
  }, [items]);

  // Global KPIs (all-time, not filtered)
  const kpis = useMemo(() => {
    const totalApplications = items.length;
    const studentSet = new Set<string>();
    const companySet = new Set<string>();
    let offers = 0;
    let interviews = 0;
    let rejected = 0;

    for (const app of items) {
      const key =
        app.studentEmail || app.studentName || `student-${app.id}`;
      studentSet.add(key);

      if (app.companyName) {
        companySet.add(app.companyName);
      }

      const stageKey = getStageKey(app.stage);
      if (stageKey === "offer") offers += 1;
      else if (stageKey === "interview") interviews += 1;
      else if (stageKey === "rejected") rejected += 1;
    }

    const applied = totalApplications - (offers + interviews + rejected);

    return {
      totalApplications,
      uniqueStudents: studentSet.size,
      uniqueCompanies: companySet.size,
      offers,
      interviews,
      rejected,
      applied: applied < 0 ? 0 : applied,
    };
  }, [items]);

  // Filtered + sorted items
  const filteredItems = useMemo(() => {
    if (!items.length) return [];

    const lowerQ = q.toLowerCase().trim();
    const stageOrder: Record<string, number> = {
      applied: 1,
      interview: 2,
      offer: 3,
      rejected: 4,
    };

    const data = items.filter((item) => {
      if (!withinTimeRange(item.createdAt, timeRange)) {
        return false;
      }

      if (stageFilter !== "all") {
        const key = getStageKey(item.stage);
        if (key !== stageFilter) return false;
      }

      if (programFilter !== "all") {
        if (!item.program || item.program !== programFilter) {
          return false;
        }
      }

      if (gradYearFilter !== "all") {
        const gy = Number(gradYearFilter);
        if (!item.gradYear || item.gradYear !== gy) {
          return false;
        }
      }

      if (companyFilter !== "all") {
        const cn = item.companyName ?? "Unknown company";
        if (cn !== companyFilter) {
          return false;
        }
      }

      if (!lowerQ) return true;
      return (
        (item.studentName &&
          item.studentName.toLowerCase().includes(lowerQ)) ||
        (item.studentEmail &&
          item.studentEmail.toLowerCase().includes(lowerQ)) ||
        (item.jobTitle &&
          item.jobTitle.toLowerCase().includes(lowerQ)) ||
        (item.companyName &&
          item.companyName.toLowerCase().includes(lowerQ)) ||
        (item.stage &&
          item.stage.toLowerCase().includes(lowerQ))
      );
    });

    data.sort((a, b) => {
      let cmp = 0;

      if (sortKey === "date") {
        const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        cmp = da - db;
      } else if (sortKey === "stage") {
        const sa = stageOrder[getStageKey(a.stage)] ?? 99;
        const sb = stageOrder[getStageKey(b.stage)] ?? 99;
        cmp = sa - sb;
      } else if (sortKey === "company") {
        const ca = a.companyName ?? "";
        const cb = b.companyName ?? "";
        cmp = ca.localeCompare(cb);
      }

      return sortDirection === "asc" ? cmp : -cmp;
    });

    return data;
  }, [
    items,
    q,
    stageFilter,
    programFilter,
    gradYearFilter,
    companyFilter,
    timeRange,
    sortKey,
    sortDirection,
  ]);

  const totalFiltered = filteredItems.length;

  // Aggregation by company for the "By company" view
  const companyAggregates = useMemo(() => {
    const map = new Map<
      string,
      {
        companyName: string;
        totalApplications: number;
        uniqueStudents: Set<string>;
        offers: number;
        interviews: number;
        rejected: number;
        applied: number;
        firstApplicationDate: Date | null;
        lastApplicationDate: Date | null;
        conversionRate: number;
      }
    >();

    for (const app of filteredItems) {
      const companyName = app.companyName ?? "Unknown company";
      if (!map.has(companyName)) {
        map.set(companyName, {
          companyName,
          totalApplications: 0,
          uniqueStudents: new Set<string>(),
          offers: 0,
          interviews: 0,
          rejected: 0,
          applied: 0,
          firstApplicationDate: null,
          lastApplicationDate: null,
          conversionRate: 0,
        });
      }

      const agg = map.get(companyName)!;
      agg.totalApplications += 1;
      const studentKey =
        app.studentEmail || app.studentName || `student-${app.id}`;
      agg.uniqueStudents.add(studentKey);

      const stageKey = getStageKey(app.stage);
      if (stageKey === "offer") agg.offers += 1;
      else if (stageKey === "interview") agg.interviews += 1;
      else if (stageKey === "rejected") agg.rejected += 1;
      else agg.applied += 1;

      if (app.createdAt) {
        const d = new Date(app.createdAt);
        if (!Number.isNaN(d.getTime())) {
          if (!agg.firstApplicationDate || d < agg.firstApplicationDate) {
            agg.firstApplicationDate = d;
          }
          if (!agg.lastApplicationDate || d > agg.lastApplicationDate) {
            agg.lastApplicationDate = d;
          }
        }
      }
    }

    const list = Array.from(map.values());
    for (const company of list) {
      company.conversionRate =
        company.totalApplications > 0
          ? (company.offers / company.totalApplications) * 100
          : 0;
    }

    return list.sort((a, b) => {
      if (b.offers !== a.offers) return b.offers - a.offers;
      if (b.interviews !== a.interviews) return b.interviews - a.interviews;
      return b.totalApplications - a.totalApplications;
    });
  }, [filteredItems]);

  const handleClearFilters = useCallback(() => {
    setStageFilter("all");
    setProgramFilter("all");
    setGradYearFilter("all");
    setCompanyFilter("all");
    setTimeRange("all");
    setQ("");
  }, []);

  const handleExportCsv = useCallback(() => {
    if (!filteredItems.length) return;

    const headers = [
      "Application ID",
      "Created At",
      "Stage",
      "Student Name",
      "Student Email",
      "Program",
      "Grad Year",
      "Job Title",
      "Company Name",
    ];

    const rows = filteredItems.map((app) => [
      app.id,
      app.createdAt ?? "",
      prettyStage(app.stage),
      app.studentName ?? "",
      app.studentEmail ?? "",
      app.program ?? "",
      app.gradYear?.toString() ?? "",
      app.jobTitle ?? "",
      app.companyName ?? "",
    ]);

    const csvContent =
      [headers, ...rows]
        .map((row) =>
          row
            .map((value) => {
              const str = String(value ?? "");
              if (str.includes(",") || str.includes('"') || str.includes("\n")) {
                return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
            })
            .join(","),
        )
        .join("\n") + "\n";

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "applications_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredItems]);

  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortDirection === "asc" ? "↑" : "↓";
  };

  const activeCompanyLink = activeCompanyName
    ? `/university/dashboard/requests?company=${encodeURIComponent(
        activeCompanyName,
      )}`
    : null;

  return (
    <UniversityDashboardShell title="Applications">
      <div className="space-y-4">
        {/* Top row: breadcrumb + search */}
        <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-xs md:text-sm text-muted-foreground">
            <span className="font-medium">Dashboard</span>
            <span className="mx-1">›</span>
            <span>Applications</span>
          </div>
          <div className="w-full max-w-xs md:ml-auto">
            <Input
              placeholder="Search by student, job, company, or stage..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {/* KPI row */}
                {/* Slim KPI row — matches Events / Partners / Students */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {/* Total applications */}
          <Card className="border border-slate-200 shadow-sm bg-white py-2">
            <CardHeader className="pt-1 pb-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Total applications
              </p>
            </CardHeader>
            <CardContent className="pt-0 pb-2">
              <p className="text-xl font-semibold text-slate-900">
                {kpis.totalApplications}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                All-time from this university
              </p>
            </CardContent>
          </Card>

          {/* Students applying */}
          <Card className="border border-slate-200 shadow-sm bg-white py-2">
            <CardHeader className="pt-1 pb-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Students applying
              </p>
            </CardHeader>
            <CardContent className="pt-0 pb-2">
              <p className="text-xl font-semibold text-slate-900">
                {kpis.uniqueStudents}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Distinct students with ≥1 application
              </p>
            </CardContent>
          </Card>

          {/* Partner companies */}
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
                Companies receiving applications
              </p>
            </CardContent>
          </Card>

          {/* Offers & interviews */}
          <Card className="border border-slate-200 shadow-sm bg-white py-2">
            <CardHeader className="pt-1 pb-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Offers & interviews
              </p>
            </CardHeader>
            <CardContent className="pt-0 pb-2">
              <p className="text-xl font-semibold text-slate-900">
                {kpis.offers}
                <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                  offers
                </span>
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {kpis.interviews} interviews · {kpis.rejected} rejections
              </p>
            </CardContent>
          </Card>
        </div>


        {/* Main content card */}
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base md:text-lg text-slate-900">
                Applications
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                Track where your students are applying and how far they move
                through each company&apos;s hiring funnel.
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center">
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                >
                  Clear filters
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800"
                >
                  Export CSV
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`rounded-full px-3 py-1 ${
                    viewMode === "list"
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  Application list
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("by-company")}
                  className={`rounded-full px-3 py-1 ${
                    viewMode === "by-company"
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  By company
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Stage pills */}
            <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="font-medium uppercase tracking-wide text-muted-foreground">
                Stage
              </span>
              <button
                type="button"
                onClick={() => setStageFilter("all")}
                className={`rounded-full border px-3 py-1 ${
                  stageFilter === "all"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                All ({kpis.totalApplications})
              </button>
              <button
                type="button"
                onClick={() => setStageFilter("applied")}
                className={`rounded-full border px-3 py-1 ${
                  stageFilter === "applied"
                    ? "border-gray-800 bg-gray-800 text-white"
                    : "border-gray-200 bg-white text-gray-800"
                }`}
              >
                Applied ({kpis.applied})
              </button>
              <button
                type="button"
                onClick={() => setStageFilter("interview")}
                className={`rounded-full border px-3 py-1 ${
                  stageFilter === "interview"
                    ? "border-blue-800 bg-blue-800 text-white"
                    : "border-blue-100 bg-white text-blue-700"
                }`}
              >
                Interview ({kpis.interviews})
              </button>
              <button
                type="button"
                onClick={() => setStageFilter("offer")}
                className={`rounded-full border px-3 py-1 ${
                  stageFilter === "offer"
                    ? "border-green-800 bg-green-800 text-white"
                    : "border-green-100 bg-white text-green-700"
                }`}
              >
                Offer ({kpis.offers})
              </button>
              <button
                type="button"
                onClick={() => setStageFilter("rejected")}
                className={`rounded-full border px-3 py-1 ${
                  stageFilter === "rejected"
                    ? "border-red-800 bg-red-800 text-white"
                    : "border-red-100 bg-white text-red-700"
                }`}
              >
                Rejected ({kpis.rejected})
              </button>
            </div>

            {/* Filters block */}
            <div className="mb-3 rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="font-medium uppercase tracking-wide">
                  Filters
                </span>
              </div>
              <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Program
                  </span>
                  <select
                    className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
                    value={programFilter}
                    onChange={(e) => setProgramFilter(e.target.value)}
                  >
                    <option value="all">All programs</option>
                    {availablePrograms.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Grad year
                  </span>
                  <select
                    className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
                    value={gradYearFilter}
                    onChange={(e) => setGradYearFilter(e.target.value)}
                  >
                    <option value="all">All years</option>
                    {availableGradYears.map((gy) => (
                      <option key={gy} value={gy.toString()}>
                        {gy}
                      </option>
                    ))}
                  </select>
                </div>

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

                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Time range
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

            {/* Filter summary + sort row */}
            <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="text-xs text-muted-foreground">
                Showing{" "}
                <span className="font-semibold">
                  {loading ? "…" : totalFiltered}
                </span>{" "}
                of{" "}
                <span className="font-semibold">
                  {kpis.totalApplications}
                </span>{" "}
                applications.
              </div>
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
                  onClick={() => handleSortClick("stage")}
                  className={`rounded-full border px-3 py-1 ${
                    sortKey === "stage"
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  Stage {sortArrow("stage")}
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

            {/* Main content based on view mode */}
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : totalFiltered === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No applications match the current filters yet.
              </div>
            ) : viewMode === "list" ? (
              <div className="space-y-2">
                {filteredItems.map((app) => {
                  const jobHref = app.jobId
                    ? `/dashboard/jobs/${app.jobId}`
                    : undefined;

                  return (
                    <div
                      key={app.id}
                      className="flex flex-col gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm md:flex-row md:items-stretch md:justify-between"
                    >
                      <div className="flex flex-1 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="font-medium text-slate-900 hover:underline"
                            onClick={() => setActiveStudent(app)}
                          >
                            {app.studentName || "Unnamed student"}
                          </button>
                          <Badge
                            variant="outline"
                            className={`text-[10px] uppercase tracking-wide ${stageBadgeClass(
                              app.stage,
                            )}`}
                          >
                            {prettyStage(app.stage)}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {app.studentEmail || "No email"}{" "}
                          {" • "}
                          {app.program || "Program not set"}
                          {app.gradYear
                            ? ` • Class of ${app.gradYear}`
                            : ""}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {app.jobTitle ? (
                            <>
                              Applied for:{" "}
                              {jobHref ? (
                                <Link
                                  href={jobHref}
                                  className="font-medium text-slate-900 hover:underline"
                                >
                                  {app.jobTitle}
                                </Link>
                              ) : (
                                <span>{app.jobTitle}</span>
                              )}
                            </>
                          ) : (
                            "Job title not available"
                          )}
                          {app.companyName && (
                            <>
                              {" @ "}
                              <button
                                type="button"
                                className="font-medium text-slate-900 hover:underline"
                                onClick={() =>
                                  setActiveCompanyName(
                                    app.companyName ?? "Unknown company",
                                  )
                                }
                              >
                                {app.companyName}
                              </button>
                            </>
                          )}
                        </div>

                        <StageTimeline stage={app.stage} />
                      </div>

                      <div className="flex flex-col items-start justify-between gap-1 text-xs text-muted-foreground md:items-end">
                        <span>
                          Submitted{" "}
                          {app.createdAt
                            ? formatDate(app.createdAt)
                            : ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {companyAggregates.map((company) => {
                  const companyHref =
                    company.companyName &&
                    company.companyName !== "Unknown company"
                      ? `/university/dashboard/requests?company=${encodeURIComponent(
                          company.companyName,
                        )}`
                      : undefined;

                  return (
                    <div
                      key={company.companyName}
                      className="flex flex-col rounded-md border border-gray-200 bg-white px-3 py-3 text-sm"
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        {companyHref ? (
                          <button
                            type="button"
                            className="text-left text-sm font-semibold text-slate-900 hover:underline"
                            onClick={() =>
                              setActiveCompanyName(company.companyName)
                            }
                          >
                            {company.companyName}
                          </button>
                        ) : (
                          <div className="text-sm font-semibold">
                            {company.companyName}
                          </div>
                        )}
                        <Badge
                          variant="outline"
                          className="border-slate-200 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-700"
                        >
                          {company.totalApplications} applications
                        </Badge>
                      </div>
                      <div className="mb-1 text-xs text-muted-foreground">
                        {company.uniqueStudents.size} students applied
                      </div>
                      <div className="mb-1 text-xs text-muted-foreground">
                        {company.offers} offer
                        {company.offers === 1 ? "" : "s"} ·{" "}
                        {company.interviews} interview
                        {company.interviews === 1 ? "" : "s"} ·{" "}
                        {company.rejected} rejected
                      </div>
                      {company.firstApplicationDate &&
                        company.lastApplicationDate && (
                          <div className="text-[11px] text-muted-foreground">
                            Activity:{" "}
                            {formatDate(
                              company.firstApplicationDate.toISOString(),
                            )}{" "}
                            –{" "}
                            {formatDate(
                              company.lastApplicationDate.toISOString(),
                            )}
                          </div>
                        )}
                      {company.conversionRate > 0 && (
                        <div className="mt-1 text-[11px] font-medium text-green-700">
                          {company.conversionRate.toFixed(1)}% offer rate
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Student side sheet with real summary */}
      <Sheet
        open={!!activeStudent}
        onOpenChange={(open) => {
          if (!open) {
            setActiveStudent(null);
            setStudentSummary(null);
            setStudentSummaryError(null);
          }
        }}
      >
        <SheetContent
          side="right"
          className="flex h-full w-full max-w-md flex-col rounded-l-2xl border-l border-slate-200 bg-white shadow-xl"
        >
          <SheetHeader className="border-b border-slate-100 pb-3">
            <SheetTitle>
              {activeStudent?.studentName || "Student overview"}
            </SheetTitle>
            <SheetDescription>
              Snapshot of this student&apos;s profile and activity on the
              platform.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 flex-1 overflow-y-auto pr-1">
            {studentSummaryLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>
            ) : studentSummaryError ? (
              <div className="text-sm text-red-600">
                {studentSummaryError}
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                {/* Basic info */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 space-y-1">
                  <p className="text-xs font-semibold text-slate-600">
                    Basic info
                  </p>
                  <p className="text-xs text-slate-700">
                    <span className="font-medium">Name: </span>
                    {studentSummary?.name ||
                      activeStudent?.studentName ||
                      "Not set"}
                  </p>
                  <p className="text-xs text-slate-700">
                    <span className="font-medium">Email: </span>
                    {studentSummary?.email ||
                      activeStudent?.studentEmail ||
                      "Not set"}
                  </p>
                  <p className="text-xs text-slate-700">
                    <span className="font-medium">Program: </span>
                    {studentSummary?.program ||
                      activeStudent?.program ||
                      "Not set"}
                  </p>
                  <p className="text-xs text-slate-700">
                    <span className="font-medium">Grad year: </span>
                    {studentSummary?.gradYear ||
                      activeStudent?.gradYear ||
                      "Not set"}
                  </p>
                  {studentSummary?.gpa && (
                    <p className="text-xs text-slate-700">
                      <span className="font-medium">GPA: </span>
                      {studentSummary.gpa}
                    </p>
                  )}
                </div>

                {/* Skills */}
                {studentSummary?.skills &&
                  studentSummary.skills.length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1">
                      <p className="text-xs font-semibold text-slate-600">
                        Skills
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {studentSummary.skills.map((skill) => (
                          <Badge
                            key={skill}
                            variant="outline"
                            className="text-[10px]"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Stats */}
                {studentSummary && (
                  <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-600">
                      Activity
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          {studentSummary.applicationsCount}
                        </div>
                        <div>Total applications</div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          {studentSummary.activeApplications}
                        </div>
                        <div>Active applications</div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          {studentSummary.eventsRegistered}
                        </div>
                        <div>Events registered</div>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-foreground">
                          {studentSummary.eventsAttended}
                        </div>
                        <div>Events attended</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-sm font-semibold text-foreground">
                          {studentSummary.lastApplicationAt
                            ? formatDate(studentSummary.lastApplicationAt)
                            : "—"}
                        </div>
                        <div>Last application activity</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-600">
                    Quick actions
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      asChild
                      className="justify-start text-xs"
                    >
                      <Link
                        href={
                          studentSummary?.id
                            ? `/university/dashboard/students/${studentSummary.id}`
                            : "/university/dashboard/students"
                        }
                      >
                        View full student profile
                      </Link>
                    </Button>
                    {studentSummary?.resumeUrl ? (
                      <Button
                        size="sm"
                        variant="outline"
                        asChild
                        className="justify-start text-xs"
                      >
                        <a
                          href={studentSummary.resumeUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View resume
                        </a>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled
                        className="justify-start text-xs"
                      >
                        No resume on file
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Partner CRM side sheet (re-using logic from Requests/Partners) */}
      <Sheet
        open={!!activeCompanyName}
        onOpenChange={(open) => {
          if (!open) {
            setActiveCompanyName(null);
            setPartnerSummary(null);
            setPartnerError(null);
          }
        }}
      >
        <SheetContent
          side="right"
          className="flex h-full w-full max-w-md flex-col rounded-l-2xl border-l border-slate-200 bg-white shadow-xl"
        >
          <SheetHeader className="border-b border-slate-100 pb-3">
            <SheetTitle>
              {activeCompanyName || "Company CRM"}
            </SheetTitle>
            <SheetDescription>
              Engagement snapshot for this employer based on student
              applications and your partner network.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 flex-1 overflow-y-auto pr-1">
            {partnerLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full rounded-lg" />
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>
            ) : partnerError ? (
              <div className="text-sm text-red-600">
                {partnerError}
              </div>
            ) : !partnerSummary ? (
              <div className="text-sm text-muted-foreground">
                This company does not appear in your approved partners yet. You
                can manage companies from the{" "}
                <Link
                  href="/university/dashboard/requests"
                  className="underline"
                >
                  Companies &amp; Partners
                </Link>{" "}
                page.
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                {/* Meta */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-1">
                  <p className="text-xs font-semibold text-slate-700">
                    Partner details
                  </p>
                  <p className="text-xs text-slate-700">
                    <span className="font-medium">Org ID: </span>
                    {partnerSummary.companyOrgId}
                  </p>
                  {partnerSummary.industry && (
                    <p className="text-xs text-slate-700">
                      <span className="font-medium">Industry: </span>
                      {partnerSummary.industry}
                    </p>
                  )}
                  {partnerSummary.websiteUrl && (
                    <p className="text-xs text-slate-700">
                      <span className="font-medium">Website: </span>
                      <a
                        href={partnerSummary.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        {partnerSummary.websiteUrl}
                      </a>
                    </p>
                  )}
                  <p className="text-xs text-slate-700">
                    <span className="font-medium">Status: </span>
                    {partnerSummary.status}
                  </p>
                  {partnerSummary.lastInteractionAt && (
                    <p className="text-xs text-slate-700">
                      <span className="font-medium">Last interaction: </span>
                      {new Date(
                        partnerSummary.lastInteractionAt,
                      ).toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Metrics */}
                <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-700">
                    Engagement metrics
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {partnerSummary.jobsCount ?? 0}
                      </div>
                      <div>Jobs shared</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        {partnerSummary.eventsCount ?? 0}
                      </div>
                      <div>Events hosted</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-sm font-semibold text-foreground">
                        {partnerSummary.applicationsCount ?? 0}
                      </div>
                      <div>Student applications to this company</div>
                    </div>
                  </div>
                </div>

                {/* Overview */}
                <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1">
                  <p className="text-xs font-semibold text-slate-700">
                    Company overview
                  </p>
                  <p className="whitespace-pre-line text-xs leading-relaxed text-slate-600">
                    {partnerSummary.aboutCompany ||
                      "No company overview on file yet. You can add internal notes and details in the Companies & Partners page."}
                  </p>
                </div>

                {/* CTA to full CRM */}
                <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                  <p className="text-xs font-semibold text-slate-700">
                    Deep-dive in partner CRM
                  </p>
                  <p className="text-xs text-slate-500">
                    Open the full partner view to see notes, contacts, and
                    engagement history for this company.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    asChild
                    className="justify-start text-xs"
                    disabled={!activeCompanyLink}
                  >
                    <Link
                      href={
                        activeCompanyLink ?? "/university/dashboard/requests"
                      }
                    >
                      Open Companies &amp; Partners
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </UniversityDashboardShell>
  );
}
