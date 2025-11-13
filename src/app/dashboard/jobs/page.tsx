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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  LayoutGrid,
  Rows,
  ArrowUpDown,
  Sparkles,
  Loader2,
  GraduationCap,
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
    reviewing: number;
    phone_screen: number;
    assessment: number;
    onsite: number;
    offer: number;
    hired: number;
    rejected: number;
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
  const [orgId, setOrgId] = useState<number | null>(null);

  // ----- Data state -----
  const [jobs, setJobs] = useState<JobWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // ----- Job creation form state -----
  const [creating, setCreating] = useState(false);
  const [generatingJD, setGeneratingJD] = useState(false);
  const [universities, setUniversities] = useState<{id: number; name: string; approved: boolean}[]>([]);
  const [loadingUniversities, setLoadingUniversities] = useState(false);
  const [form, setForm] = useState({
    title: "",
    dept: "",
    locationMode: "remote",
    salaryRange: "",
    descriptionMd: "",
    status: "draft" as "draft" | "published" | "closed",
    visibility: "public" as "public" | "institutions" | "both",
    universityIds: [] as number[],
    location: "",
    seniority: "junior" as "junior" | "mid" | "senior",
    skillsCsv: "",
  });

  // ----- Filters / sort / view (top bar shows these; status+search are applied) -----
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [seniorityFilter, setSeniorityFilter] = useState<SeniorityFilter>("all"); // display only
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("30d"); // display only
  const [modeFilter, setModeFilter] = useState<ModeFilter>("all"); // display only
  const [sortKey, setSortKey] = useState<SortKey>("createdAt"); // display only
  const [sortDir, setSortDir] = useState<SortDir>("desc"); // display only
  const [viewMode, setViewMode] = useState<ViewMode>("list"); // 🔄 default to LIST

  // Search (simple + immediate)
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);

  // Settings modal
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // ---------------- Auth & lifecycle ----------------
  useEffect(() => {
    if (!isPending && !session?.user) router.push("/login");
  }, [session, isPending, router]);

  // Fetch organization early (needed for job creation form)
  useEffect(() => {
    if (session?.user && !orgId) {
      const fetchOrg = async () => {
        try {
          const token = localStorage.getItem("bearer_token");
          const orgResp = await fetch("/api/organizations?mine=true", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (orgResp.ok) {
            const orgs = await orgResp.json();
            if (Array.isArray(orgs) && orgs.length > 0) {
              setOrgId(orgs[0].id);
              setOrg(orgs[0]);
            }
          }
        } catch (error) {
          console.error("Failed to fetch organization:", error);
        }
      };
      fetchOrg();
    }
  }, [session, orgId]);

  // Fetch approved universities when orgId is available and form is visible
  useEffect(() => {
    if (orgId && searchParams?.get("create") === "1") {
      const fetchUniversities = async () => {
        setLoadingUniversities(true);
        try {
          const token = localStorage.getItem("bearer_token");
          const response = await fetch(`/api/employer/universities?orgId=${orgId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (response.ok) {
            const data = await response.json();
            const approvedUniversities = data.filter((uni: any) => uni.approved);
            setUniversities(approvedUniversities);
          }
        } catch (error) {
          console.error("Failed to fetch universities:", error);
        } finally {
          setLoadingUniversities(false);
        }
      };
      fetchUniversities();
    }
  }, [orgId, searchParams]);

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

  // Load jobs on session ready or status/search change
  useEffect(() => {
    if (session?.user && orgId) fetchJobs();
  }, [session, orgId, statusFilter, searchQuery]);

  // ---------------- Data fetchers ----------------
  const fetchJobs = async (force = false) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("bearer_token");

      // 1) Use orgId if available, otherwise fetch org
      let orgIdParam = "";
      if (orgId) {
        orgIdParam = `&orgId=${orgId}`;
      } else {
        const orgResp = await fetch("/api/organizations?mine=true", { headers: { Authorization: `Bearer ${token}` } });
        if (orgResp.ok) {
          const orgs = await orgResp.json();
          if (Array.isArray(orgs) && orgs.length > 0) {
            setOrgId(orgs[0].id);
            setOrg(orgs[0]);
            orgIdParam = `&orgId=${orgs[0].id}`;
          }
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

        // 4) For each job, fetch applications to compute simple stage counts
        const jobsWithStats = await Promise.all(
          data.map(async (job: Job) => {
            try {
              const appsResp = await fetch(`/api/applications?jobId=${job.id}`, {
                headers: { Authorization: `Bearer ${token}` },
              });

              // defaults - all statuses
              let stats = {
                sourced: 0,
                applied: 0,
                reviewing: 0,
                phone_screen: 0,
                assessment: 0,
                onsite: 0,
                offer: 0,
                hired: 0,
                rejected: 0,
              };
              let totalCandidates = 0;

              if (appsResp.ok) {
                const applications = await appsResp.json();
                totalCandidates = applications.length;
                applications.forEach((app: any) => {
                  if (app.source && app.source.trim() !== "") stats.sourced++;
                  switch (app.stage) {
                    case "applied": stats.applied++; break;
                    case "reviewing": stats.reviewing++; break;
                    case "phone_screen": stats.phone_screen++; break;
                    case "assessment":
                    case "assessments": stats.assessment++; break;
                    case "onsite": stats.onsite++; break;
                    case "offer": stats.offer++; break;
                    case "hired": stats.hired++; break;
                    case "rejected": stats.rejected++; break;
                    default:
                      if (!app.stage || app.stage === "") stats.applied++;
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
                applicationStats: { 
                  sourced: 0, applied: 0, reviewing: 0, phone_screen: 0,
                  assessment: 0, onsite: 0, offer: 0, hired: 0, rejected: 0 
                },
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

  // ---------------- Job creation handlers ----------------
  const handleGenerateJD = async () => {
    if (!orgId) return toast.error("No organization found");
    if (!form.title) return toast.error("Enter a job title first");

    setGeneratingJD(true);
    try {
      const token = localStorage.getItem("bearer_token");

      // Create draft job shell
      const createResp = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          orgId,
          title: form.title,
          dept: form.dept,
          locationMode: form.locationMode,
          salaryRange: form.salaryRange,
          status: "draft",
          location: form.location,
          seniority: form.seniority,
          skillsCsv: form.skillsCsv,
        }),
      });
      if (!createResp.ok) throw new Error();
      const job = await createResp.json();

      // Ask AI to generate description
      const prompt = `Create a comprehensive job description for a ${form.title} position${
        form.dept ? ` in the ${form.dept} department` : ""
      }. Location mode: ${form.locationMode}${
        form.location ? `, Work location: ${form.location}` : ""
      }${
        form.seniority ? `. Seniority: ${form.seniority}` : ""
      }${
        form.skillsCsv ? `. Required skills: ${form.skillsCsv}` : ""
      }${
        form.salaryRange ? `. Salary: ${form.salaryRange}` : ""
      }. Make it suitable for the Pakistan job market with both English and Urdu context. Provide clear responsibilities and qualifications, and a short application CTA.`;

      const jdResp = await fetch("/api/ai/generate-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ jobId: job.id, prompt }),
      });

      if (jdResp.ok) {
        const jd = await jdResp.json();
        setForm((p) => ({ ...p, descriptionMd: jd.contentMd }));
        toast.success("Generated description");
      }
    } catch {
      toast.error("Failed to generate description");
    } finally {
      setGeneratingJD(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return toast.error("No organization found");

    setCreating(true);
    try {
      const token = localStorage.getItem("bearer_token");
      const resp = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orgId, ...form }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to create job");

      toast.success("Job created successfully!");
      // Reset form
      setForm({
        title: "",
        dept: "",
        locationMode: "remote",
        salaryRange: "",
        descriptionMd: "",
        status: "draft",
        visibility: "public",
        universityIds: [],
        location: "",
        seniority: "junior",
        skillsCsv: "",
      });
      // Remove create param and refresh
      router.push("/dashboard/jobs");
      await fetchJobs(true);
      // Navigate to job detail page
      router.push(`/dashboard/jobs/${data.id}`);
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setCreating(false);
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
        </div>
      </div>
    );
  }
  if (!session?.user) return null;

  // Reusable per-stage counts strip
  const StageStrip = ({ job }: { job: JobWithStats }) => {
    const statusConfig = [
      { key: 'sourced' as const, label: 'SOURCED' },
      { key: 'applied' as const, label: 'APPLIED' },
      { key: 'reviewing' as const, label: 'REVIEWING' },
      { key: 'phone_screen' as const, label: 'PHONE SCREEN' },
      { key: 'assessment' as const, label: 'ASSESSMENT' },
      { key: 'onsite' as const, label: 'ON-SITE' },
      { key: 'offer' as const, label: 'OFFER' },
      { key: 'hired' as const, label: 'HIRED' },
      { key: 'rejected' as const, label: 'REJECTED' },
    ];
    return (
      <div className="grid gap-1.5 grid-cols-9 overflow-x-auto">
        {statusConfig.map(({ key, label }) => (
          <div key={key} className="text-center min-w-[60px] flex-shrink-0">
            <div className="text-sm font-semibold text-gray-900">{job.applicationStats[key]}</div>
            <div className="text-[9px] text-gray-500 leading-tight whitespace-nowrap">{label}</div>
          </div>
        ))}
      </div>
    );
  };

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
        {/* Breadcrumb and spacing — match Assessments page */}
        <div className="p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <nav className="flex items-center gap-2 text-sm">
                <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 transition-colors">
                  Dashboard
                </Link>
                <span className="text-gray-400">›</span>
                <span className="text-gray-900 font-medium">Jobs</span>
              </nav>
            </div>

            {/* KPI Row - Only show when NOT creating a job */}
            {searchParams?.get("create") !== "1" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <StatTile icon={Briefcase} label="Open Jobs" value={countsByStatus.published + countsByStatus.draft} />
                <StatTile icon={User} label="Total Candidates" value={totals.totalCandidates} />
                <StatTile icon={BarChartIcon} label="Funnel (Hired/Applied)" value={`${totals.funnel}%`} />
                <StatTile icon={ListChecks} label="Fill Velocity" value={totals.fillVelocity} sub="Hires per job" />
              </div>
            )}

            {/* Toolbar (WRAPS to 2nd line instead of leaking) - Only show when NOT creating a job */}
            {searchParams?.get("create") !== "1" && (
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="px-6 sm:px-8 py-3">
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
                        {/* Search */}
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

                        {/* Sort (display only) */}
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

                        {/* View toggle */}
                        <div className="flex bg-gray-100 rounded-lg p-1">
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
                        </div>

                        {/* (Removed) New Job button from toolbar */}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CONTENT (Jobs) */}
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-0">
          {/* Job Creation Form - Shows when ?create=1 */}
          {searchParams?.get("create") === "1" && (
            <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Create a Job</h2>
                <Button
                  variant="ghost"
                  onClick={() => router.push("/dashboard/jobs")}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </Button>
              </div>

              {!orgId ? (
                <div className="text-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-gray-500">Loading organization...</p>
                </div>
              ) : (
                <form onSubmit={handleCreate} className="space-y-6">
                  <div>
                    <Label htmlFor="title">Job Title *</Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g., Senior Software Engineer"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="dept">Department</Label>
                      <Input
                        id="dept"
                        value={form.dept}
                        onChange={(e) => setForm({ ...form, dept: e.target.value })}
                        placeholder="e.g., Engineering"
                      />
                    </div>
                    <div>
                      <Label htmlFor="locationMode">Location Mode</Label>
                      <Select value={form.locationMode} onValueChange={(v) => setForm({ ...form, locationMode: v })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="remote">Remote</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                          <SelectItem value="onsite">On-site</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="location">Work Location (City/Office)</Label>
                      <Input
                        id="location"
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                        placeholder="e.g., Lahore, PK or DHA Phase 5 Office"
                      />
                    </div>
                    <div>
                      <Label htmlFor="seniority">Seniority</Label>
                      <Select
                        value={form.seniority}
                        onValueChange={(v: "junior" | "mid" | "senior") => setForm({ ...form, seniority: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="junior">Junior</SelectItem>
                          <SelectItem value="mid">Mid</SelectItem>
                          <SelectItem value="senior">Senior</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="salaryRange">Salary Range</Label>
                    <Input
                      id="salaryRange"
                      value={form.salaryRange}
                      onChange={(e) => setForm({ ...form, salaryRange: e.target.value })}
                      placeholder="e.g., PKR 150,000 - 250,000/month"
                    />
                  </div>

                  <div>
                    <Label htmlFor="skillsCsv">Required Skills (comma-separated)</Label>
                    <Input
                      id="skillsCsv"
                      value={form.skillsCsv}
                      onChange={(e) => setForm({ ...form, skillsCsv: e.target.value })}
                      placeholder="e.g., React, TypeScript, Node, Postgres"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="descriptionMd">Job Description</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateJD}
                        disabled={generatingJD || !form.title}
                        className="gap-2"
                      >
                        {generatingJD ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Generate with AI
                          </>
                        )}
                      </Button>
                    </div>
                    <Textarea
                      id="descriptionMd"
                      value={form.descriptionMd}
                      onChange={(e) => setForm({ ...form, descriptionMd: e.target.value })}
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="visibility">Visibility</Label>
                      <Select value={form.visibility} onValueChange={(v) => setForm({ ...form, visibility: v as any })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="institutions">Selected Institutions Only</SelectItem>
                          <SelectItem value="both">Institutions + Public</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {(form.visibility === 'institutions' || form.visibility === 'both') && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <GraduationCap className="w-4 h-4 text-[#6a994e]" />
                        <Label>Select Universities</Label>
                      </div>
                      <p className="text-xs text-muted-foreground mb-3">
                        Choose which universities can see this job posting.
                      </p>
                      
                      {loadingUniversities ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Loading universities...
                        </div>
                      ) : universities.length > 0 ? (
                        <div className="space-y-2 max-h-40 overflow-y-auto border border-[#d4d4d8] rounded-md p-3">
                          {universities.map((university) => (
                            <div key={university.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`university-${university.id}`}
                                checked={form.universityIds.includes(university.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setForm({
                                      ...form,
                                      universityIds: [...form.universityIds, university.id]
                                    });
                                  } else {
                                    setForm({
                                      ...form,
                                      universityIds: form.universityIds.filter(id => id !== university.id)
                                    });
                                  }
                                }}
                              />
                              <Label
                                htmlFor={`university-${university.id}`}
                                className="text-sm font-normal cursor-pointer"
                              >
                                {university.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground border border-[#d4d4d8] rounded-md">
                          No approved universities available. Please request access to universities in your organization settings first.
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <Button type="submit" disabled={creating} className="gap-2">
                      {creating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Create Job
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ======= LIST / GRID SWITCH ======= */}
          <div className="">
            {jobs.length === 0 ? (
              // Empty state
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
                  onClick={() => router.push("/dashboard/jobs?create=1")}
                  className="bg-[#6a994e] hover:bg-[#5a8a3e] text-white"
                >
                  Create your first job
                </Button>
              </div>
            ) : viewMode === "list" ? (
              // ======= LIST VIEW =======
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

                        {job.location && (
                          <div className="text-xs text-gray-500 mt-1">
                            <span>📍 {job.location}</span>
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

                    <Link href={`/dashboard/jobs/${job.id}`} className="block cursor-pointer">
                      <StageStrip job={job} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              // ======= GRID VIEW =======
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow transition-shadow flex flex-col"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/dashboard/jobs/${job.id}`} className="min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 hover:text-[#6a994e] transition-colors truncate">
                          {job.title}
                        </h3>
                        <div className="text-[11px] text-gray-500 mt-1">
                          {new Date(job.createdAt).toLocaleDateString()} • {job.createdBy}
                        </div>
                        {job.location && (
                          <div className="text-xs text-gray-500 mt-1 truncate">📍 {job.location}</div>
                        )}
                        {job.locationMode && (
                          <div className="text-[11px] text-gray-500 mt-0.5">{job.locationMode}</div>
                        )}
                      </Link>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusPill(job.status)}`}>
                          {job.status === "closed" ? "archived" : job.status}
                        </span>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
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

                   <div className="mt-4 text-xs text-gray-600">
  <span className="font-medium">{job.totalCandidates}</span> candidates
</div>

                  </div>
                ))}
              </div>
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
