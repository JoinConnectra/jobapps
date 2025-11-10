"use client";

/**
 * AllJobsPage — Hybrid
 * --------------------
 * - TOP: sticky header + KPI + responsive toolbar (from "new" file)
 * - BOTTOM: job list as spaced tiles (cards) so rows don't visually mix
 * - Fix: toolbar never leaks horizontally; wraps cleanly to second line
 * - Change: remove "+ New Job" button from toolbar
 * - Change: removed bottom "Create a Job" panel
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { useEmployerAuth } from "@/hooks/use-employer-auth";
import { authClient } from "@/lib/auth-client";
import { useCommandPalette } from "@/hooks/use-command-palette";

import CompanySidebar from "@/components/company/CompanySidebar";
import CommandPalette from "@/components/CommandPalette";
import SettingsModal from "@/components/SettingsModal";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  Briefcase,
  ListChecks,
  Plus,
  BarChartIcon,
  User,
  Search,
  MoreHorizontal,
  Trash2,
  Edit,
  Filter,
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  Rows,
  ArrowUpDown,
  Command as CommandIcon,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/** Basic Job shape returned from API (unchanged) */
interface Job {
  id: number;
  title: string;
  dept: string | null;
  status: string;
  orgId: number;
  createdAt: string;
  locationMode?: string | null;
  salaryRange?: string | null;

  // Optional UI fields
  location?: string | null;
  seniority?: "junior" | "mid" | "senior" | "" | null;
  skillsCsv?: string | null;
}

/** Job + computed stats for UI display */
interface JobWithStats extends Job {
  applicationStats: {
    sourced: number;
    applied: number;
    managerScreen: number;
    onsite: number;
    offer: number;
    hired: number;
  };
  totalCandidates: number;
  createdBy: string;
}

type StatusFilter = "all" | "published" | "draft" | "archived";
type SeniorityFilter = "all" | "junior" | "mid" | "senior";
type TimeFilter = "all" | "7d" | "30d" | "90d";
type ModeFilter = "all" | "remote" | "hybrid" | "onsite";
type SortKey = "createdAt" | "candidates";
type SortDir = "desc" | "asc";
type ViewMode = "grid" | "list";

export default function AllJobsPage() {
  // ----- Session & routing -----
  const { session, isPending } = useEmployerAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isOpen: isCommandPaletteOpen, open: openCommandPalette, close: closeCommandPalette } = useCommandPalette();

  // ----- Org -----
  const [org, setOrg] = useState<{ id: number; name: string; logoUrl?: string | null } | null>(null);

  // ----- Data state -----
  const [jobs, setJobs] = useState<JobWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // ----- Filters / sort / view (top bar shows these; status+search are applied) -----
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [seniorityFilter, setSeniorityFilter] = useState<SeniorityFilter>("all"); // display only
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("30d"); // display only
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all"); // display only
  const [sortKey, setSortKey] = useState<SortKey>("createdAt"); // display only
  const [sortDir, setSortDir] = useState<SortDir>("desc"); // display only
  const [viewMode, setViewMode] = useState<ViewMode>("grid"); // display only

  // Search (simple + immediate like old code)
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);

  // Settings modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // ---------------- Auth & lifecycle ----------------
  useEffect(() => {
    if (!isPending && !session?.user) router.push("/login");
  }, [session, isPending, router]);

  // Keyboard shortcuts (⌘/Ctrl K; / focus; R refresh; G toggle)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const key = e.key.toLowerCase();
      if ((isMac && e.metaKey && key === "k") || (!isMac && e.ctrlKey && key === "k")) {
        e.preventDefault();
        openCommandPalette();
        return;
      }
      if (key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (key === "r" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        fetchJobs(true);
        return;
      }
      if (key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setViewMode((v) => (v === "grid" ? "list" : "grid"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openCommandPalette]);

  // Load jobs on session ready or status/search change (old behavior)
  useEffect(() => {
    if (session?.user) fetchJobs();
  }, [session, statusFilter, searchQuery]);

  // ---------------- Data fetchers ----------------
  const fetchJobs = async (force = false) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("bearer_token");

      // 1) Primary org
      const orgResp = await fetch("/api/organizations?mine=true", { headers: { Authorization: `Bearer ${token}` } });
      let orgIdParam = "";
      if (orgResp.ok) {
        const orgs = await orgResp.json();
        if (Array.isArray(orgs) && orgs.length > 0) {
          setOrg(orgs[0]);
          orgIdParam = `&orgId=${orgs[0].id}`;
        }
      }

      // 2) Build query (status + search)
      let query = `/api/jobs?limit=100${orgIdParam}`;
      if (statusFilter !== "all") query += `&status=${statusFilter}`;
      if (searchQuery.trim()) query += `&search=${encodeURIComponent(searchQuery.trim())}`;

      // 3) Fetch jobs
      const response = await fetch(query, { headers: { Authorization: `Bearer ${token}` } });
      if (response.ok) {
        const data = await response.json();

        // 4) For each job, fetch applications to compute simple stage counts (old behavior)
        const jobsWithStats = await Promise.all(
          data.map(async (job: Job) => {
            try {
              const appsResp = await fetch(`/api/applications?jobId=${job.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });

              // defaults
              let stats = {
                sourced: 0,
                applied: 0,
                managerScreen: 0,
                onsite: 0,
                offer: 0,
                hired: 0,
              };
              let totalCandidates = 0;

              if (appsResp.ok) {
                const applications = await appsResp.json();
                totalCandidates = applications.length;
                applications.forEach((app: any) => {
                  switch (app.stage) {
                    case "applied":
                      stats.applied++;
                      break;
                    case "reviewing":
                    case "phone_screen":
                      stats.managerScreen++;
                      break;
                    case "onsite":
                      stats.onsite++;
                      break;
                    case "offer":
                      stats.offer++;
                      break;
                    case "hired":
                      stats.hired++;
                      break;
                    default:
                      break;
                  }
                });
              }

              return {
                ...job,
                applicationStats: stats,
                totalCandidates,
                createdBy: session?.user?.name || "You",
              } as JobWithStats;
            } catch {
              return {
                ...job,
                applicationStats: { sourced: 0, applied: 0, managerScreen: 0, onsite: 0, offer: 0, hired: 0 },
                totalCandidates: 0,
                createdBy: session?.user?.name || "You",
              } as JobWithStats;
            }
          })
        );

        setJobs(jobsWithStats);
      }

      setLastRefreshedAt(new Date());
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Display helpers for TOP KPIs ----------------
  const countsByStatus = useMemo(() => {
    const all = jobs.length;
    const draft = jobs.filter((j) => j.status === "draft").length;
    const published = jobs.filter((j) => j.status === "published").length;
    const archived = jobs.filter((j) => j.status === "closed" || j.status === "archived").length;
    return { all, published, draft, archived };
  }, [jobs]);

  const totals = useMemo(() => {
    const totalCandidates = jobs.reduce((s, j) => s + j.totalCandidates, 0);
    const totalHires = jobs.reduce((s, j) => s + j.applicationStats.hired, 0);
    const totalApplied = jobs.reduce((s, j) => s + j.applicationStats.applied, 0);
    const funnel = totalApplied ? Math.round((totalHires / totalApplied) * 100) : 0;
    const fillVelocity = jobs.length ? (totalHires / jobs.length).toFixed(2) : "0.00";
    return { totalCandidates, funnel, fillVelocity };
  }, [jobs]);

  const statusPill = (status: string) =>
    status === "published"
      ? "bg-green-100 text-green-700"
      : status === "draft"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-gray-100 text-gray-700";

  const handleStatusChange = async (jobId: number, newStatus: string) => {
    try {
      const token = localStorage.getItem("bearer_token");
      const resp = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (resp.ok) {
        toast.success(`Job ${newStatus === "closed" ? "archived" : newStatus}`);
        fetchJobs(true);
      } else {
        toast.error("Failed to update job status");
      }
    } catch {
      toast.error("Failed to update job status");
    }
  };

  const handleDelete = async (jobId: number) => {
    if (!confirm("Are you sure you want to delete this job? This action cannot be undone.")) return;
    try {
      const token = localStorage.getItem("bearer_token");
      const resp = await fetch(`/api/jobs/${jobId}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (resp.ok) {
        toast.success("Job deleted");
        fetchJobs(true);
      } else {
        toast.error("Failed to delete job");
      }
    } catch {
      toast.error("Failed to delete job");
    }
  };

  // Small bits for top
  const LiveDot = () => (
    <span className="relative flex h-2.5 w-2.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
    </span>
  );

  const StatTile = ({
    icon: Icon,
    label,
    value,
    sub,
  }: {
    icon: any;
    label: string;
    value: number | string;
    sub?: string;
  }) => (
    <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow transition-shadow">
      <div className="absolute inset-0 bg-gradient-to-tr from-[#6a994e]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-[#6a994e]/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-[#6a994e]" />
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
          <div className="text-2xl font-semibold text-gray-900 truncate">{value}</div>
          {sub ? <div className="text-[11px] text-gray-500 mt-0.5">{sub}</div> : null}
        </div>
      </div>
    </div>
  );

  // ----- Loading & empty-session states -----
  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-sm text-muted-foreground">Loading jobs…</p>
        </div>
      </div>
    );
  }
  if (!session?.user) return null;

  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
      {/* Sidebar */}
      <CompanySidebar
        org={org}
        user={session.user}
        onSignOut={async () => {
          const { error } = await authClient.signOut();
          if (error?.code) toast.error(error.code);
          else {
            localStorage.removeItem("bearer_token");
            router.push("/");
          }
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        active="jobs"
      />

      {/* Main */}
      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto overflow-x-hidden">
        {/* Sticky header */}
        <div className="sticky top-0 z-30 border-b border-gray-200 bg-[#FEFEFA]/90 backdrop-blur">
          <div className="max-w-6xl mx-auto px-6 sm:px-8 py-4">
            <div className="flex items-center justify-between gap-3">
              {/* Breadcrumbs + icon */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-10 w-10 rounded-lg bg-white border border-gray-200 grid place-items-center shrink-0">
                  <Briefcase className="h-5 w-5 text-gray-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-gray-500">Dashboard</div>
                  <div className="flex items-center gap-2 text-sm">
                    <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
                      Home
                    </Link>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
                    <span className="text-gray-900 font-medium truncate">Jobs</span>
                  </div>
                </div>
              </div>

              {/* Live + Command */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="hidden md:flex items-center gap-2 text-xs text-gray-500" title="Live status">
                  <LiveDot />
                  <span>
                    Live •{" "}
                    {lastRefreshedAt
                      ? `Updated ${new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(
                          -Math.max(1, Math.floor((Date.now() - lastRefreshedAt.getTime()) / 1000)),
                          "second"
                        )}`
                      : "Connecting…"}
                  </span>
                </div>
                <Button variant="outline" className="hidden md:flex gap-2" onClick={openCommandPalette} title="⌘K / Ctrl+K">
                  <CommandIcon className="h-4 w-4" />
                  Command
                </Button>
              </div>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <StatTile icon={Briefcase} label="Open Jobs" value={countsByStatus.published + countsByStatus.draft} />
              <StatTile icon={User} label="Total Candidates" value={totals.totalCandidates} />
              <StatTile icon={BarChartIcon} label="Funnel (Hired/Applied)" value={`${totals.funnel}%`} />
              <StatTile icon={ListChecks} label="Fill Velocity" value={totals.fillVelocity} sub="Hires per job" />
            </div>
          </div>

          {/* Toolbar (WRAPS to 2nd line instead of leaking) */}
          <div className="border-t border-gray-200 bg-white">
            <div className="max-w-6xl mx-auto px-6 sm:px-8 py-3">
              {/* Two columns that wrap on small screens */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* LEFT: status chips + filters */}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status chips with counts */}
                    <div className="flex flex-wrap bg-gray-100 rounded-lg p-1">
                      {([
                        ["all", countsByStatus.all, "All"],
                        ["published", countsByStatus.published, "Published"],
                        ["draft", countsByStatus.draft, "Draft"],
                        ["archived", countsByStatus.archived, "Archived"],
                      ] as [StatusFilter, number, string][]).map(([key, count, label]) => (
                        <button
                          key={key}
                          onClick={() => setStatusFilter(key)}
                          className={[
                            "px-3 py-2 rounded-md text-sm font-medium transition-all inline-flex items-center gap-2",
                            statusFilter === key ? "bg-[#6a994e] text-white shadow-sm" : "text-gray-700 hover:bg-gray-200/60",
                          ].join(" ")}
                        >
                          <span>{label}</span>
                          <span
                            className={[
                              "px-1.5 py-0.5 text-[10px] rounded-md",
                              statusFilter === key ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700",
                            ].join(" ")}
                          >
                            {count}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Extra filters (visual only; do not affect API in this hybrid) */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Filter className="h-4 w-4 text-gray-400 hidden md:block" />
                      <Select value={timeFilter} onValueChange={(v: TimeFilter) => setTimeFilter(v)}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="Time" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All time</SelectItem>
                          <SelectItem value="7d">Last 7 days</SelectItem>
                          <SelectItem value="30d">Last 30 days</SelectItem>
                          <SelectItem value="90d">Last 90 days</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={seniorityFilter} onValueChange={(v: SeniorityFilter) => setSeniorityFilter(v)}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="Seniority" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All levels</SelectItem>
                          <SelectItem value="junior">Junior</SelectItem>
                          <SelectItem value="mid">Mid</SelectItem>
                          <SelectItem value="senior">Senior</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={modeFilter} onValueChange={(v: ModeFilter) => setModeFilter(v)}>
                        <SelectTrigger className="w-40"><SelectValue placeholder="Mode" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All modes</SelectItem>
                          <SelectItem value="remote">Remote</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                          <SelectItem value="onsite">On-site</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* RIGHT: search, sort, view toggle */}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2 min-w-0">
                    {/* Search (full width on mobile to avoid overflow) */}
                    <div className="relative w-full sm:w-72" title="Press / to focus">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        ref={searchRef}
                        placeholder="Search by title, location, owner"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    {/* Sort (display only in this hybrid) */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="gap-2">
                          <ArrowUpDown className="h-4 w-4" />
                          Sort
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => setSortKey("createdAt")}>
                          Created {sortKey === "createdAt" ? "•" : ""}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortKey("candidates")}>
                          Candidates {sortKey === "candidates" ? "•" : ""}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}>
                          Direction: {sortDir.toUpperCase()}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* View toggle (display only) */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={[
                          "px-3 py-2 rounded-md text-sm font-medium transition-all inline-flex items-center gap-2",
                          viewMode === "grid" ? "bg-[#6a994e] text-white shadow-sm" : "text-gray-700 hover:bg-gray-200/60",
                        ].join(" ")}
                        title="G to toggle"
                      >
                        <LayoutGrid className="h-4 w-4" />
                        Grid
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={[
                          "px-3 py-2 rounded-md text-sm font-medium transition-all inline-flex items-center gap-2",
                          viewMode === "list" ? "bg-[#6a994e] text-white shadow-sm" : "text-gray-700 hover:bg-gray-200/60",
                        ].join(" ")}
                        title="G to toggle"
                      >
                        <Rows className="h-4 w-4" />
                        List
                      </button>
                    </div>

                    {/* (Removed) New Job button from toolbar */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT (Jobs as spaced tiles) */}
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-8">
          <div className="">
            {jobs.length === 0 ? (
              // Empty state (kept simple)
              <div className="text-center py-16 bg-white rounded-lg shadow-sm">
                <div className="flex items-center justify-center mb-6">
                  <div className="w-16 h-16 border-2 border-gray-300 rounded-lg flex items-center justify-center">
                    <div className="w-8 h-8 border border-gray-300 rounded-sm flex items-center justify-center">
                      <Plus className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Post a job</h3>
                <p className="text-sm text-gray-500 mb-6">Once you do, they will sit right here for you</p>
                <Button
                  onClick={() => router.push("/dashboard/jobs/new")}
                  className="bg-[#6a994e] hover:bg-[#5a8a3e] text-white"
                >
                  Create your first job
                </Button>
              </div>
            ) : (
              // Spaced tiles; keep stage counts in ONE LINE (6 columns)
              <ul className="space-y-2 sm:space-y-3">
                {jobs.map((job) => (
                  <li
                    key={job.id}
                    className="rounded-xl border border-gray-200 bg-white px-5 py-6 md:py-7 shadow-sm hover:shadow transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-3">
                      {/* Job title / meta */}
                      <Link href={`/dashboard/jobs/${job.id}`} className="flex-1 cursor-pointer min-w-0">
                        <div className="flex items-center gap-3">
                          <h3 className="text-sm font-medium text-gray-900 hover:text-[#6a994e] transition-colors truncate">
                            {job.title}
                          </h3>
                          {job.locationMode && <span className="text-xs text-gray-500">{job.locationMode}</span>}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {job.totalCandidates} candidates • {job.createdBy} •{" "}
                          {new Date(job.createdAt).toLocaleDateString()}
                        </div>

                        {/* quick meta */}
                        {(job.location || job.seniority || job.skillsCsv) && (
                          <div className="text-xs text-gray-500 mt-1">
                            {job.location ? <span className="mr-3">📍 {job.location}</span> : null}
                            {job.seniority ? <span className="mr-3">🎯 {job.seniority}</span> : null}
                            {job.skillsCsv ? <span>🛠️ {job.skillsCsv}</span> : null}
                          </div>
                        )}
                      </Link>

                      {/* Status badge + row actions */}
                      <div className="flex items-center gap-2 shrink-0 pl-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusPill(job.status)}`}>
                          {job.status === "closed" ? "archived" : job.status}
                        </span>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/dashboard/jobs/${job.id}`)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Job
                            </DropdownMenuItem>

                            {job.status === "published" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(job.id, "draft")}>
                                Move to Draft
                              </DropdownMenuItem>
                            )}
                            {job.status === "draft" && (
                              <DropdownMenuItem onClick={() => handleStatusChange(job.id, "published")}>
                                Publish
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleStatusChange(job.id, "closed")}>
                              Archive
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(job.id)} className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Per-stage counts (ONE LINE, fixed 6 columns) */}
                    <Link href={`/dashboard/jobs/${job.id}`} className="block cursor-pointer">
                      <div className="grid grid-cols-6 gap-3">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-900">{job.applicationStats.sourced}</div>
                          <div className="text-xs text-gray-500">SOURCED</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-900">{job.applicationStats.applied}</div>
                          <div className="text-xs text-gray-500">APPLIED</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-900">{job.applicationStats.managerScreen}</div>
                          <div className="text-xs text-gray-500">MANAGER SCREEN</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-900">{job.applicationStats.onsite}</div>
                          <div className="text-xs text-gray-500">ON-SITE</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-900">{job.applicationStats.offer}</div>
                          <div className="text-xs text-gray-500">OFFER</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-semibold text-gray-900">{job.applicationStats.hired}</div>
                          <div className="text-xs text-gray-500">HIRED</div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Command palette */}
        <CommandPalette isOpen={isCommandPaletteOpen} onClose={closeCommandPalette} orgId={org?.id} />

        {/* Settings modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={async () => {
            setIsSettingsOpen(false);
            try {
              const token = localStorage.getItem("bearer_token");
              const orgResp = await fetch("/api/organizations?mine=true", {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (orgResp.ok) {
                const orgs = await orgResp.json();
                if (Array.isArray(orgs) && orgs.length > 0) setOrg(orgs[0]);
              }
            } catch (error) {
              console.error("Failed to refresh org data:", error);
            }
          }}
          organization={
            org
              ? {
                  id: org.id,
                  name: org.name,
                  slug: "",
                  type: "company",
                  plan: "free",
                  seatLimit: 5,
                  logoUrl: org.logoUrl,
                  createdAt: "",
                  updatedAt: "",
                }
              : null
          }
        />
      </main>
    </div>
  );
}
