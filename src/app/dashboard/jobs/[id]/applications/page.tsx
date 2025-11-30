"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession, authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  User,
  Filter,
  MoreVertical,
  ChevronDown,
  RefreshCcw,
  Clock,
  Trash2,
  AlertTriangle,
  Check,
  Loader2,
  FileText,
  Eye,
  ArrowUpDown,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import CommandPalette from "@/components/CommandPalette";
import SettingsModal from "@/components/SettingsModal";
import CompanySidebar from "@/components/company/CompanySidebar";
import { useCommandPalette } from "@/hooks/use-command-palette";

interface Application {
  id: number;
  applicantEmail: string;
  applicantName?: string | null; // full name if available
  stage: string;
  source: string | null;
  createdAt: string;
  jobTitle: string;
}

interface Job {
  id: number;
  title: string;
}

type RankItem = {
  resumeId: number;
  applicationId: number;
  candidateId: string | number | null;
  createdAt: string;
  score: number;
  breakdown: {
    skillCoverage: number;
    textSim: number;
    format: number;
    impact: number;
    certBonus: number;
    toolBonus: number;
    presence: number;
    matchedSkillsCount: number;
    requiredSkillsTotal: number;
  };
};

type RankResponse = {
  ok: boolean;
  jobId: string | number;
  deduped: boolean;
  resumeId: number | null;
  ranked: RankItem[];
};

/** Map backend stage -> human label */
function formatStageLabel(stage: string): string {
  const map: Record<string, string> = {
    applied: "Applied",
    reviewing: "Reviewing",
    assessment: "Assessment",
    phone_screen: "Phone Screen",
    onsite: "Onsite",
    offer: "Offer",
    hired: "Hired",
    rejected: "Rejected",
  };
  if (map[stage]) return map[stage];
  return stage
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

/** Get status badge based on stage */
function getStatusBadge(stage: string) {
  switch (stage) {
    case "applied":
      return (
        <Badge
          variant="outline"
          className="bg-blue-500/15 text-blue-700 hover:bg-blue-500/25 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 border-0"
        >
          Applied
        </Badge>
      );
    case "reviewing":
      return (
        <Badge
          variant="outline"
          className="bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20 border-0"
        >
          Reviewing
        </Badge>
      );
    case "assessment":
      return (
        <Badge
          variant="outline"
          className="bg-purple-500/15 text-purple-700 hover:bg-purple-500/25 dark:bg-purple-500/10 dark:text-purple-400 dark:hover:bg-purple-500/20 border-0"
        >
          Assessment
        </Badge>
      );
    case "phone_screen":
      return (
        <Badge
          variant="outline"
          className="bg-indigo-500/15 text-indigo-700 hover:bg-indigo-500/25 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 border-0"
        >
          Phone Screen
        </Badge>
      );
    case "onsite":
      return (
        <Badge
          variant="outline"
          className="bg-cyan-500/15 text-cyan-700 hover:bg-cyan-500/25 dark:bg-cyan-500/10 dark:text-cyan-400 dark:hover:bg-cyan-500/20 border-0"
        >
          Onsite
        </Badge>
      );
    case "offer":
      return (
        <Badge
          variant="outline"
          className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 border-0"
        >
          Offer
        </Badge>
      );
    case "hired":
      return (
        <Badge
          variant="outline"
          className="bg-green-500/15 text-green-700 hover:bg-green-500/25 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20 border-0"
        >
          Hired
        </Badge>
      );
    case "rejected":
      return (
        <Badge
          variant="outline"
          className="bg-rose-500/15 text-rose-700 hover:bg-rose-500/25 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 border-0"
        >
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          {formatStageLabel(stage)}
        </Badge>
      );
  }
}

export default function JobApplicationsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { data: session, isPending } = useSession();
  const {
    isOpen: isCommandPaletteOpen,
    open: _openCommandPalette, // not used yet
    close: closeCommandPalette,
  } = useCommandPalette();

  const [job, setJob] = useState<Job | null>(null);

  // Keep ALL applications here, always fetched without stage filter
  const [allApplications, setAllApplications] = useState<Application[]>([]);

  // UI & controls
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [org, setOrg] = useState<{
    id: number;
    name: string;
    logoUrl?: string | null;
  } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    applicationId: number | null;
    applicantEmail: string;
  }>({ isOpen: false, applicationId: null, applicantEmail: "" });
  const [deleting, setDeleting] = useState(false);
  const [selectedApplications, setSelectedApplications] = useState<number[]>(
    []
  );
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>("none"); // "none" | "ats" | "recent" | "oldest"

  // ATS scores mapped by application id
  const [atsByApp, setAtsByApp] = useState<
    Record<number, { score: number; resumeId: number }>
  >({});
  const [atsLoading, setAtsLoading] = useState(false);

  // ---- Auth gate ----
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  // ---- Initial data ----
  useEffect(() => {
    if (session?.user && params.id) {
      fetchJobAndOrg();
      fetchAllApplications(); // always ALL (unfiltered)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, params.id]);

  // Refresh ATS whenever the dataset changes
  useEffect(() => {
    if (allApplications.length) {
      fetchAtsScores();
    } else {
      setAtsByApp({});
    }
  }, [allApplications]);

  // Close actions menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (dropdownOpen && !target.closest(".dropdown-container")) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen)
      document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  // ---- Fetchers ----
  const fetchJobAndOrg = async () => {
    try {
      const token = localStorage.getItem("bearer_token");

      // Job
      const jobResponse = await fetch(`/api/jobs?id=${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (jobResponse.ok) {
        const jobData = await jobResponse.json();
        setJob(jobData);
      }

      // Org (for sidebar)
      const orgResp = await fetch("/api/organizations?mine=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (orgResp.ok) {
        const orgs = await orgResp.json();
        if (Array.isArray(orgs) && orgs.length > 0) {
          setOrg({
            id: orgs[0].id,
            name: orgs[0].name,
            logoUrl: orgs[0].logoUrl,
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch job/org:", error);
    }
  };

  const fetchAllApplications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("bearer_token");
      // Always pull ALL; let the client filter for view & counts
      const appsResponse = await fetch(
        `/api/applications?jobId=${params.id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (appsResponse.ok) {
        const appsData = await appsResponse.json();
        setAllApplications(appsData || []);
      } else {
        setAllApplications([]);
      }
    } catch (error) {
      console.error("Failed to fetch applications:", error);
      setAllApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAtsScores = async () => {
    try {
      setAtsLoading(true);
      const token = localStorage.getItem("bearer_token");
      const resp = await fetch(`/api/ats/jobs/${params.id}/rank`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!resp.ok) return;

      const data: RankResponse = await resp.json();
      if (!data?.ok || !Array.isArray(data.ranked)) return;

      const map: Record<number, { score: number; resumeId: number }> = {};
      for (const item of data.ranked) {
        if (item.applicationId != null) {
          map[item.applicationId] = {
            score: item.score,
            resumeId: item.resumeId,
          };
        }
      }
      setAtsByApp(map);
    } catch (e) {
      console.error("ATS rank error:", e);
    } finally {
      setAtsLoading(false);
    }
  };

  // ---- Mutations ----
  const handleDeleteApplication = async () => {
    if (!deleteDialog.applicationId) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(
        `/api/applications/${deleteDialog.applicationId}/delete`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        toast.success("Application deleted successfully");
        setAllApplications((prev) =>
          prev.filter((app) => app.id !== deleteDialog.applicationId)
        );
        setDeleteDialog({
          isOpen: false,
          applicationId: null,
          applicantEmail: "",
        });
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to delete application");
      }
    } catch (error) {
      console.error("Delete application error:", error);
      toast.error("An error occurred while deleting the application");
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteDialog = (applicationId: number, applicantEmail: string) => {
    setDeleteDialog({ isOpen: true, applicationId, applicantEmail });
  };
  const closeDeleteDialog = () =>
    setDeleteDialog({
      isOpen: false,
      applicationId: null,
      applicantEmail: "",
    });

  const toggleApplicationSelection = (applicationId: number) => {
    setSelectedApplications((prev) =>
      prev.includes(applicationId)
        ? prev.filter((id) => id !== applicationId)
        : [...prev, applicationId]
    );
  };

  // ---- Derived data ----
  const stageKeys = [
    "applied",
    "reviewing",
    "assessment",
    "phone_screen",
    "onsite",
    "offer",
    "hired",
    "rejected",
  ] as const;

  const viewApps = useMemo(() => {
    let filtered = filter === "all" 
      ? allApplications 
      : allApplications.filter((a) => a.stage === filter);
    
    // Apply sorting based on selected method
    if (sortBy !== "none") {
      filtered = [...filtered].sort((a, b) => {
        switch (sortBy) {
          case "ats":
            // Sort by ATS score (highest to lowest)
            const scoreA = atsByApp[a.id]?.score ?? -1;
            const scoreB = atsByApp[b.id]?.score ?? -1;
            return scoreB - scoreA; // Descending order (highest first)
          
          case "recent":
            // Sort by most recent (newest first)
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          
          case "oldest":
            // Sort by oldest first (applied first)
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          
          default:
            return 0;
        }
      });
    }
    
    return filtered;
  }, [allApplications, filter, sortBy, atsByApp]);

  const stageCounts = useMemo(() => {
    const base: Record<string, number> = { all: allApplications.length };
    for (const key of stageKeys) {
      base[key] = allApplications.filter((a) => a.stage === key).length;
    }
    return base;
  }, [allApplications]);

  const formatScore = (score?: number) => {
    if (typeof score !== "number" || Number.isNaN(score)) return null;
    const clamped = Math.max(0, Math.min(1, score));
    return Math.round(clamped * 100);
  };

  // ---- Bulk actions helpers ----
  const selectAllApplications = () =>
    setSelectedApplications(viewApps.map((app) => app.id));
  const clearSelection = () => setSelectedApplications([]);

  const handleBulkStageUpdate = async (newStage: string) => {
    if (selectedApplications.length === 0) {
      toast.error("No applications selected");
      return;
    }
    setBulkActionLoading(true);
    try {
      const token = localStorage.getItem("bearer_token");
      const results = await Promise.all(
        selectedApplications.map((applicationId) =>
          fetch(`/api/applications/${applicationId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ stage: newStage }),
          })
        )
      );
      const successful = results.filter((r) => r.ok).length;
      if (successful === selectedApplications.length) {
        toast.success(
          `Successfully updated ${successful} application${
            successful > 1 ? "s" : ""
          } to ${formatStageLabel(newStage)}`
        );
        setAllApplications((prev) =>
          prev.map((app) =>
            selectedApplications.includes(app.id)
              ? { ...app, stage: newStage }
              : app
          )
        );
        clearSelection();
        setBulkActionMode(false);
      } else {
        toast.error(
          `Updated ${successful} of ${selectedApplications.length} applications`
        );
      }
    } catch (error) {
      console.error("Bulk update error:", error);
      toast.error("Failed to update applications");
    } finally {
      setBulkActionLoading(false);
    }
  };

  // ---- Loading / auth ----
  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  if (!session?.user || !job) return null;

  const stages = [
    { value: "all", label: "All", count: stageCounts.all },
    { value: "applied", label: "Applied", count: stageCounts.applied },
    { value: "reviewing", label: "Reviewing", count: stageCounts.reviewing },
    { value: "assessment", label: "Assessment", count: stageCounts.assessment },
    {
      value: "phone_screen",
      label: "Phone Screen",
      count: stageCounts.phone_screen,
    },
    { value: "onsite", label: "Onsite", count: stageCounts.onsite },
    { value: "offer", label: "Offer", count: stageCounts.offer },
    { value: "hired", label: "Hired", count: stageCounts.hired },
    { value: "rejected", label: "Rejected", count: stageCounts.rejected },
  ];

  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
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

      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto">
        <div className="p-8">
          <div className="max-w-6xl">
            <div className="flex items-center gap-4 mb-8">
              <nav className="flex items-center gap-2 text-sm">
                <Link
                  href="/dashboard"
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Dashboard
                </Link>
                <span className="text-gray-400">&gt;</span>
                <Link
                  href="/dashboard/jobs"
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Jobs
                </Link>
                <span className="text-gray-400">&gt;</span>
                <Link
                  href={`/dashboard/jobs/${params.id}`}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {job.title}
                </Link>
                <span className="text-gray-400">&gt;</span>
                <span className="text-gray-900 font-medium">
                  Applications
                </span>
              </nav>
            </div>

            {/* Header */}
            <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-1">
                    {job.title} - Applications
                  </h2>
                  <p className="text-sm text-gray-500">
                    {allApplications.length} total application
                    {allApplications.length !== 1 ? "s" : ""}
                  </p>
                </div>

                <Button
                  variant="outline"
                  onClick={fetchAtsScores}
                  disabled={atsLoading}
                  className="flex items-center gap-2"
                  title="Refresh ATS scores"
                >
                  <RefreshCcw
                    className={`w-4 h-4 ${
                      atsLoading ? "animate-spin" : ""
                    }`}
                  />
                  {atsLoading ? "Refreshing" : "Refresh ATS"}
                </Button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter className="w-4 h-4 text-gray-500" />
                  {stages.map((stage) => (
                    <button
                      key={stage.value}
                      onClick={() => setFilter(stage.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        filter === stage.value
                          ? "bg-[#6a994e] text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {stage.label} ({stage.count})
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  {/* Bulk actions */}
                  <div className="relative dropdown-container">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDropdownOpen(!dropdownOpen);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-all"
                    >
                      <MoreVertical className="w-4 h-4" />
                      Actions
                      <ChevronDown className="w-3 h-3" />
                    </button>

                    {dropdownOpen && (
                      <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50 dropdown-container">
                        <div className="p-2">
                          {/* Sort options */}
                          <div className="px-3 py-2 text-xs text-gray-500 font-medium mb-1">
                            Sort by:
                          </div>
                          <button
                            onClick={() => {
                              setSortBy("none");
                              setDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors mb-1 ${
                              sortBy === "none"
                                ? "bg-gray-100 text-gray-900 font-medium"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            <ArrowUpDown className="w-3 h-3 inline mr-2" />
                            No sorting
                          </button>
                          <button
                            onClick={() => {
                              setSortBy("ats");
                              setDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors mb-1 ${
                              sortBy === "ats"
                                ? "bg-gray-100 text-gray-900 font-medium"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            <ArrowUpDown className="w-3 h-3 inline mr-2" />
                            ATS (Highest to Lowest)
                          </button>
                          <button
                            onClick={() => {
                              setSortBy("recent");
                              setDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors mb-1 ${
                              sortBy === "recent"
                                ? "bg-gray-100 text-gray-900 font-medium"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            <ArrowUpDown className="w-3 h-3 inline mr-2" />
                            Most Recent
                          </button>
                          <button
                            onClick={() => {
                              setSortBy("oldest");
                              setDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors mb-2 ${
                              sortBy === "oldest"
                                ? "bg-gray-100 text-gray-900 font-medium"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            <ArrowUpDown className="w-3 h-3 inline mr-2" />
                            Applied First
                          </button>

                          <div className="border-t border-gray-200 my-2"></div>

                          <button
                            onClick={() => {
                              setBulkActionMode(!bulkActionMode);
                              if (!bulkActionMode) clearSelection();
                              setDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            {bulkActionMode
                              ? "Exit Selection"
                              : "Select Applications"}
                          </button>

                          {bulkActionMode && (
                            <>
                              <button
                                onClick={() => {
                                  selectAllApplications();
                                  setDropdownOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                Select All (this view)
                              </button>
                              <button
                                onClick={() => {
                                  clearSelection();
                                  setDropdownOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                              >
                                Clear Selection
                              </button>

                              <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100">
                                {selectedApplications.length} selected
                              </div>

                              <div className="px-3 py-2 text-xs text-gray-500 font-medium">
                                Quick Actions:
                              </div>

                              {stages.slice(1).map((stage) => (
                                <button
                                  key={stage.value}
                                  onClick={() => {
                                    setDropdownOpen(false);
                                    handleBulkStageUpdate(stage.value);
                                  }}
                                  disabled={bulkActionLoading}
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Move to {stage.label}
                                </button>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Applications Table */}
            <div className="rounded-lg border bg-card">
              {bulkActionMode && (
                <div className="p-4 bg-gray-100 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-600 rounded-full" />
                      <span className="text-sm font-medium text-gray-900">
                        Selection Mode Active
                      </span>
                      <span className="text-xs text-gray-600">
                        ({selectedApplications.length} selected)
                      </span>
                    </div>
                    <button
                      onClick={() => setBulkActionMode(false)}
                      className="text-xs text-gray-700 hover:text-gray-900 underline"
                    >
                      Exit Selection
                    </button>
                  </div>
                </div>
              )}

              {viewApps.length === 0 ? (
                <div className="text-center py-12">
                  <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">
                    No applications found for this filter
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b">
                      {bulkActionMode && (
                        <TableHead className="h-12 px-4 w-[50px]">
                          <button
                            onClick={() => {
                              if (selectedApplications.length === viewApps.length) {
                                clearSelection();
                              } else {
                                selectAllApplications();
                              }
                            }}
                            className="w-5 h-5 rounded border-2 flex items-center justify-center transition-all border-gray-300 hover:border-gray-400"
                          >
                            {selectedApplications.length === viewApps.length && (
                              <Check className="w-3 h-3" />
                            )}
                          </button>
                        </TableHead>
                      )}
                      <TableHead className="h-12 px-4 font-medium">Applicant</TableHead>
                      <TableHead className="h-12 px-4 font-medium">Email</TableHead>
                      <TableHead className="h-12 px-4 font-medium w-[100px]">ATS</TableHead>
                      <TableHead className="h-12 px-4 font-medium w-[120px]">Status</TableHead>
                      <TableHead className="h-12 px-4 font-medium">Applied Date</TableHead>
                      <TableHead className="h-12 px-4 font-medium">Source</TableHead>
                      <TableHead className="h-12 px-4 font-medium w-[180px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewApps.map((app) => {
                      const entry = atsByApp[app.id];
                      const pct = formatScore(entry?.score);
                      const displayName =
                        app.applicantName?.trim() || app.applicantEmail;
                      const appliedDate = new Date(app.createdAt).toLocaleDateString();
                      const isSelected = selectedApplications.includes(app.id);

                      return (
                        <TableRow
                          key={app.id}
                          className={`hover:bg-muted/50 ${
                            isSelected ? "bg-gray-100" : ""
                          }`}
                        >
                          {bulkActionMode && (
                            <TableCell className="h-16 px-4">
                              <button
                                onClick={() =>
                                  toggleApplicationSelection(app.id)
                                }
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                                  isSelected
                                    ? "bg-[#6a994e] border-[#6a994e] text-white"
                                    : "border-gray-300 hover:border-gray-400"
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3" />}
                              </button>
                            </TableCell>
                          )}
                          <TableCell className="h-16 px-4 font-medium">
                            <Link
                              href={`/dashboard/applications/${app.id}`}
                              className="text-gray-900 hover:text-gray-700 transition-colors"
                            >
                              {displayName}
                            </Link>
                          </TableCell>
                          <TableCell className="h-16 px-4 text-sm text-muted-foreground">
                            {app.applicantEmail}
                          </TableCell>
                          <TableCell className="h-16 px-4">
                            {pct != null ? (
                              <div className="flex items-center gap-2">
                                <div className="relative w-10 h-10" title={`ATS ${pct}%`}>
                                  <svg className="w-full h-full -rotate-90">
                                    <circle
                                      cx="20"
                                      cy="20"
                                      r="18"
                                      strokeWidth="4"
                                      className="stroke-gray-200 fill-none"
                                    />
                                    <circle
                                      cx="20"
                                      cy="20"
                                      r="18"
                                      strokeWidth="4"
                                      className={`${
                                        pct >= 80
                                          ? "stroke-green-500"
                                          : pct >= 60
                                          ? "stroke-yellow-500"
                                          : pct >= 30
                                          ? "stroke-red-500"
                                          : "stroke-gray-300"
                                      } fill-none transition-all duration-700`}
                                      strokeDasharray={Math.PI * 2 * 18}
                                      strokeDashoffset={
                                        Math.PI * 2 * 18 * (1 - pct / 100)
                                      }
                                    />
                                  </svg>
                                  <span
                                    className={`absolute inset-0 flex items-center justify-center text-[11px] font-bold ${
                                      pct >= 80
                                        ? "text-green-700"
                                        : pct >= 60
                                        ? "text-yellow-700"
                                        : pct >= 30
                                        ? "text-red-700"
                                        : "text-gray-700"
                                    }`}
                                  >
                                    {pct}
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="h-16 px-4">
                            {getStatusBadge(app.stage)}
                          </TableCell>
                          <TableCell className="h-16 px-4 text-sm text-muted-foreground">
                            {appliedDate}
                          </TableCell>
                          <TableCell className="h-16 px-4 max-w-[200px] text-sm text-muted-foreground">
                            {app.source ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="block cursor-help truncate">
                                      via {app.source}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                    <p className="text-white">via {app.source}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="h-16 px-4">
                            <TooltipProvider>
                              <div className="flex items-center gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      asChild
                                    >
                                      <Link href={`/dashboard/applications/${app.id}`}>
                                        <Eye className="size-4" />
                                      </Link>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                    <span className="text-white">View Details</span>
                                  </TooltipContent>
                                </Tooltip>
                                {!bulkActionMode && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 text-destructive hover:bg-destructive hover:text-white"
                                        onClick={() =>
                                          openDeleteDialog(app.id, app.applicantEmail)
                                        }
                                      >
                                        <Trash2 className="size-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                      <span className="text-white">Delete</span>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>
      </main>

      {deleteDialog.isOpen && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Delete Application
                  </h3>
                  <p className="text-sm text-gray-500">
                    This action cannot be undone
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-700">
                  Are you sure you want to delete the application from{" "}
                  <span className="font-medium text-gray-900">
                    {deleteDialog.applicantEmail}
                  </span>
                  ? This will permanently remove all associated data including:
                </p>
                <ul className="mt-3 text-xs text-gray-600 space-y-1">
                  <li>• Voice answers and recordings</li>
                  <li>• Text answers</li>
                  <li>• Comments and reactions</li>
                  <li>• Application history</li>
                </ul>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={closeDeleteDialog}
                  variant="outline"
                  className="flex-1"
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteApplication}
                  variant="destructive"
                  className="flex-1"
                  disabled={deleting}
                >
                  {deleting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Deleting...
                    </div>
                  ) : (
                    "Delete Application"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        orgId={org?.id}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        organization={
          org
            ? {
                id: org.id,
                name: org.name,
                slug: "",
                type: "company",
                plan: "free",
                seatLimit: 5,
                createdAt: "",
                updatedAt: "",
              }
            : null
        }
      />
    </div>
  );
}
