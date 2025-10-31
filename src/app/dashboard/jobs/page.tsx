"use client";

/**
 * AllJobsPage
 * -----------
 * Employer dashboard screen that lists all jobs for the user's primary organization.
 *
 * Responsibilities:
 * - Gate access: checks session and redirects to /login if unauthenticated.
 * - Loads user's primary organization to scope the jobs query.
 * - Fetches jobs (optionally filtered by status & search) and computes application stats per job.
 * - Provides actions: create job, publish/archive/delete, and quick navigation to job details.
 * - Preserves dashboard look & feel (left sidebar + main content) consistent with other pages.
 *
 * URL: /dashboard/jobs
 */

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEmployerAuth } from "@/hooks/use-employer-auth";
import {
  Briefcase,
  ListChecks,
  Plus,
  Sparkles,
  BarChartIcon,
  Loader2,
  ArrowLeft,
  User,
  Search,
  HelpCircle,
  UserPlus,
  LogOut,
  Bell,
  MoreHorizontal,
  Trash2,
  Edit,
  Settings,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import CommandPalette from "@/components/CommandPalette";
import SettingsModal from "@/components/SettingsModal";
import { useCommandPalette } from "@/hooks/use-command-palette";

/** Basic Job shape returned from API */
interface Job {
  id: number;
  title: string;
  dept: string | null;
  status: string;
  orgId: number;
  createdAt: string;
  locationMode?: string | null;
  salaryRange?: string | null;
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

export default function AllJobsPage() {
  // ----- Session & routing -----
  const { session, isPending } = useEmployerAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isOpen: isCommandPaletteOpen, open: openCommandPalette, close: closeCommandPalette } =
    useCommandPalette();

  // ----- Page state -----
  const [jobs, setJobs] = useState<JobWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<number | null>(null);
  const [org, setOrg] = useState<{ id: number; name: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "archived">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // ----- Create job modal state -----
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
  });

  /**
   * Redirect unauthenticated users to /login
   */
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  /**
   * Load jobs whenever:
   * - session becomes available
   * - filters/search change
   */
  useEffect(() => {
    if (session?.user) {
      fetchJobs();
    }
  }, [session, statusFilter, searchQuery]);

  /**
   * Fetch approved universities when orgId is available
   */
  useEffect(() => {
    if (orgId) {
      fetchUniversities();
    }
  }, [orgId]);

  /**
   * Fetch org (to scope jobs) + jobs list + per-job application stats
   * - Scopes by the first (primary) organization for the user.
   * - Applies status/search filters.
   * - For each job, fetches applications to compute simple counts for badges.
   */
  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem("bearer_token");

      // 1) Determine primary org to scope the job query
      const orgResp = await fetch("/api/organizations?mine=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      let orgIdParam = "";
      if (orgResp.ok) {
        const orgs = await orgResp.json();
        if (Array.isArray(orgs) && orgs.length > 0) {
          setOrgId(orgs[0].id);
          setOrg(orgs[0]);
          orgIdParam = `&orgId=${orgs[0].id}`;
        }
      }

      // 2) Build jobs query with current filters
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

              // default stats
              let stats = {
                sourced: 0,
                applied: 0,
                managerScreen: 0,
                onsite: 0,
                offer: 0,
                hired: 0,
              };
              let totalCandidates = 0;
              let createdBy = "Unknown";

              if (appsResp.ok) {
                const applications = await appsResp.json();
                totalCandidates = applications.length;

                // naive stage aggregation for UI badges
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

              // show creator (basic: use current user name)
              createdBy = session?.user?.name || "You";

              return {
                ...job,
                applicationStats: stats,
                totalCandidates,
                createdBy,
              };
            } catch (error) {
              // If stats call fails, preserve job row with zeros so UI remains stable
              console.error(`Failed to fetch stats for job ${job.id}:`, error);
              return {
                ...job,
                applicationStats: {
                  sourced: 0,
                  applied: 0,
                  managerScreen: 0,
                  onsite: 0,
                  offer: 0,
                  hired: 0,
                },
                totalCandidates: 0,
                createdBy: session?.user?.name || "You",
              };
            }
          })
        );

        setJobs(jobsWithStats);
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch approved universities for this organization
   */
  const fetchUniversities = async () => {
    if (!orgId) return;
    
    setLoadingUniversities(true);
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/employer/universities?orgId=${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Only show approved universities
        const approvedUniversities = data.filter((uni: any) => uni.approved);
        setUniversities(approvedUniversities);
      }
    } catch (error) {
      console.error("Failed to fetch universities:", error);
    } finally {
      setLoadingUniversities(false);
    }
  };

  /**
   * Generate a JD with AI helper (creates a draft job first, then fills description)
   * - Requires orgId and a title at minimum.
   */
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
        }),
      });
      if (!createResp.ok) throw new Error();
      const job = await createResp.json();

      // Ask AI to generate description
      const prompt = `Create a comprehensive job description for a ${form.title} position${
        form.dept ? ` in the ${form.dept} department` : ""
      }. Location: ${form.locationMode}${
        form.salaryRange ? `. Salary: ${form.salaryRange}` : ""
      }. Make it suitable for the Pakistan job market with both English and Urdu context.`;

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

  /**
   * Handle manual job creation (uses current form fields).
   */
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

      toast.success("Job created");
      router.push(`/dashboard/jobs/${data.id}`);
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setCreating(false);
    }
  };

  /**
   * Update a job's status (publish/draft/archive), then refresh list.
   */
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
        fetchJobs(); // Refresh the list
      } else {
        toast.error("Failed to update job status");
      }
    } catch (error) {
      toast.error("Failed to update job status");
    }
  };

  /**
   * Permanently delete a job (asks for confirmation).
   */
  const handleDelete = async (jobId: number) => {
    if (!confirm("Are you sure you want to delete this job? This action cannot be undone.")) {
      return;
    }

    try {
      const token = localStorage.getItem("bearer_token");
      const resp = await fetch(`/api/jobs/${jobId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (resp.ok) {
        toast.success("Job deleted");
        fetchJobs();
      } else {
        toast.error("Failed to delete job");
      }
    } catch (error) {
      toast.error("Failed to delete job");
    }
  };

  /**
   * Sign the user out and redirect home
   */
  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) {
      toast.error(error.code);
    } else {
      localStorage.removeItem("bearer_token");
      router.push("/");
    }
  };

  // ----- Loading & empty-session states -----
  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  if (!session?.user) return null;

  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
      {/* ------------------------------------------------------------------
          LEFT SIDEBAR
          Consistent with other dashboard pages: org title, quick create,
          primary nav (Activities, Jobs, Assessments), and user tools.
      ------------------------------------------------------------------ */}
      <aside className="w-64 bg-[#FEFEFA] border-r border-gray-200 flex flex-col h-screen sticky top-0">
        <div className="p-6">
          {/* Organization Name */}
          <div className="text-xl font-display font-bold text-gray-900 mb-6">
            {org?.name || "forshadow"}
          </div>

          {/* Shortcut: Create job button */}
          <Button
            onClick={() => router.push("/dashboard/jobs?create=1")}
            className="w-full mb-6 bg-[#F5F1E8] text-gray-900 hover:bg-[#E8E0D5] border-0"
          >
            + Create a Job
          </Button>

          {/* Primary nav */}
          <nav className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900"
              onClick={() => router.push("/dashboard")}
            >
              <Bell className="w-4 h-4 mr-3" />
              Activities
            </Button>

            {/* This page (Jobs) is active-styled */}
            <Button className="w-full justify-start text-gray-700 bg-[#F5F1E8] text-gray-900" variant="ghost">
              <Briefcase className="w-4 h-4 mr-3" />
              Jobs
            </Button>

            {/* Link to org-scoped Assessments page */}
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900"
              onClick={() => router.push(`/dashboard/organizations/${org?.id}/assessments`)}
            >
              <ListChecks className="w-4 h-4 mr-3" />
              Assessments
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900"
              onClick={() => router.push("/dashboard/kpi/insights")}
            >
              <BarChartIcon className="w-4 h-4 mr-3" />
              KPI · Insights
            </Button>
          </nav>
        </div>

        {/* Bottom utilities (search, help, invite, logout) + user avatar */}
        <div className="mt-auto p-6 border-t border-gray-200">
          <div className="space-y-3">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-500 text-sm"
              onClick={openCommandPalette}
            >
              <Search className="w-4 h-4 mr-3" />
              Search
              <span className="ml-auto text-xs">⌘K</span>
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-500 text-sm">
              <HelpCircle className="w-4 h-4 mr-3" />
              Help & Support
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-500 text-sm">
              <UserPlus className="w-4 h-4 mr-3" />
              Invite people
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-500 text-sm"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-3" />
              Log out
            </Button>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white text-sm font-medium">{session.user.name?.charAt(0)}</span>
            </div>
            <div className="flex-1 text-sm font-medium text-gray-900">{session.user.name}</div>
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              title="Settings"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------------------------
          MAIN CONTENT
          Breadcrumbs > optional Create form > Filters/Search > Job list
      ------------------------------------------------------------------ */}
      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto">
        <div className="p-8">
          <div className="max-w-6xl">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-4 mb-8">
              <nav className="flex items-center gap-2 text-sm">
                <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 transition-colors">
                  Dashboard
                </Link>
                <span className="text-gray-400">&gt;</span>
                <span className="text-gray-900 font-medium">Jobs</span>
              </nav>
            </div>

            {/* Conditional: "Create Job" card when ?create=1 */}
            {searchParams?.get("create") === "1" && (
              <div className="bg-white rounded-lg shadow-sm p-8 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Create a Job</h2>
                </div>

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

                  {/* University Selection - Only show when institutions or both is selected */}
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
              </div>
            )}

            {/* Status filter chips + search */}
            <div className="flex items-center justify-between mb-6">
              {/* Filter buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === "all" ? "bg-[#6a994e] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter("published")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === "published" ? "bg-[#6a994e] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Published
                </button>
                <button
                  onClick={() => setStatusFilter("draft")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === "draft" ? "bg-[#6a994e] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Draft
                </button>
                <button
                  onClick={() => setStatusFilter("archived")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === "archived" ? "bg-[#6a994e] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Archived
                </button>
              </div>

              {/* Search input */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search by title, location or owner"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-80"
                  />
                </div>
              </div>
            </div>

            {/* Jobs table/list */}
            <div className="bg-white rounded-lg shadow-sm">
              {jobs.length === 0 ? (
                // Empty state
                <div className="text-center py-16">
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
              ) : (
                // Populated list
                <div className="divide-y divide-gray-100">
                  {jobs.map((job) => (
                    <div key={job.id} className="p-5 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        {/* Job title / meta */}
                        <Link href={`/dashboard/jobs/${job.id}`} className="flex-1 cursor-pointer">
                          <div className="flex items-center gap-3">
                            <h3 className="text-sm font-medium text-gray-900 hover:text-[#6a994e] transition-colors">
                              {job.title}
                            </h3>
                            {job.locationMode && (
                              <span className="text-xs text-gray-500">{job.locationMode}</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {job.totalCandidates} candidates • {job.createdBy} •{" "}
                            {new Date(job.createdAt).toLocaleDateString()}
                          </div>
                        </Link>

                        {/* Status badge + row actions */}
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              job.status === "published"
                                ? "bg-green-100 text-green-700"
                                : job.status === "draft"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {job.status}
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

                      {/* Per-stage counts (quick glance) */}
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

        {/* Command palette portal (global quick actions) */}
        <CommandPalette isOpen={isCommandPaletteOpen} onClose={closeCommandPalette} orgId={org?.id} />
        
        {/* Settings modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          organization={org ? { id: org.id, name: org.name, slug: '', type: 'company', plan: 'free', seatLimit: 5, createdAt: '', updatedAt: '' } : null}
        />
      </div>
    );
  }
