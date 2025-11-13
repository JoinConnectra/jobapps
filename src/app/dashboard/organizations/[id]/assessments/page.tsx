// src/app/dashboard/organizations/[id]/assessments/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, authClient } from "@/lib/auth-client";
import { useCommandPalette } from "@/hooks/use-command-palette";

import CompanySidebar from "@/components/company/CompanySidebar";
import CommandPalette from "@/components/CommandPalette";
import SettingsModal from "@/components/SettingsModal";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Search,
  Rows,
  LayoutGrid,
  Filter,
  ChevronDown,
  ArrowUpDown,
  Clock,
  BookOpen,
  ClipboardList,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Server shape (matches DB): */
type Assessment = {
  id: number;
  orgId: number;
  jobId: number | null;
  title: string;
  type: string;       // "MCQ" | "Coding" | "Case Study" | ...
  duration: string;   // "30 min"
  status: string;     // "Draft" | "Published"
  descriptionMd: string | null;
  isPublished: boolean;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
};

// ----- Local UI helpers -----
type StatusFilter = "all" | "published" | "draft";
type TypeFilter = "all" | "MCQ" | "Coding" | "Case Study";
type LinkFilter = "all" | "linked" | "standalone"; // has jobId vs null
type DurationFilter = "all" | "short" | "medium" | "long"; // <=30, 31-60, >60 min
type TimeFilter = "all" | "7d" | "30d" | "90d";
type SortKey = "createdAt" | "title" | "duration" | "status";
type SortDir = "asc" | "desc";
type ViewMode = "list" | "grid";

function parseDurationToSeconds(s?: string | null): number | null {
  if (!s) return null;
  const str = String(s).toLowerCase();
  const h = str.match(/(\d+)\s*(h|hr|hour|hours)/i)?.[1];
  const m = str.match(/(\d+)\s*(m|min|mins|minute|minutes)/i)?.[1];
  if (h || m) {
    return (h ? Number(h) * 3600 : 0) + (m ? Number(m) * 60 : 0);
  }
  const lone = str.match(/(\d+)/)?.[1];
  if (lone) return Number(lone) * 60; // assume minutes
  return null;
}

function formatMinutes(secs: number | null) {
  if (!secs) return "—";
  const m = Math.round(secs / 60);
  return `${m} min`;
}

export default function AssessmentsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const orgIdFromRoute = useMemo(() => {
    const raw = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [params]);

  const { isOpen: isCommandPaletteOpen, close: closeCommandPalette } = useCommandPalette();

  const [org, setOrg] = useState<{ id: number; name: string; logoUrl?: string | null } | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loadingAssessments, setLoadingAssessments] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  // New Assessment modal
  const [openNew, setOpenNew] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"MCQ" | "Coding" | "Case Study">("MCQ");
  const [duration, setDuration] = useState("30 min");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Toolbar UI state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [linkFilter, setLinkFilter] = useState<LinkFilter>("all");
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("30d");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement | null>(null);

  /** Redirect unauthenticated users */
  useEffect(() => {
    if (!isPending && !session?.user) router.push("/login");
  }, [session, isPending, router]);

  /** Sidebar org (for avatar/logo, plan, etc.) */
  useEffect(() => {
    if (!session?.user) return;
    (async () => {
      try {
        const token = localStorage.getItem("bearer_token");
        const resp = await fetch("/api/organizations?mine=true", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          const orgs = await resp.json();
          if (Array.isArray(orgs) && orgs.length > 0) {
            setOrg({ id: orgs[0].id, name: orgs[0].name, logoUrl: orgs[0].logoUrl });
          }
        }
      } catch (e) {
        console.error("Failed to fetch org (sidebar):", e);
      } finally {
        setLoadingOrg(false);
      }
    })();
  }, [session]);

  /** Load from API (raw list; client applies search/filters/sort) */
  const loadAssessments = async () => {
    if (!orgIdFromRoute) return;
    setLoadingAssessments(true);
    try {
      const token = localStorage.getItem("bearer_token");
      const resp = await fetch(`/api/assessments?orgId=${orgIdFromRoute}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const rows: Assessment[] = await resp.json();
        setAssessments(rows);
        setLastRefreshedAt(new Date());
      } else {
        console.warn("Failed to load assessments:", await resp.text());
      }
    } catch (e) {
      console.error("Error loading assessments:", e);
    } finally {
      setLoadingAssessments(false);
    }
  };

  useEffect(() => {
    if (session?.user && orgIdFromRoute) loadAssessments();
  }, [session, orgIdFromRoute]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setViewMode((v) => (v === "grid" ? "list" : "grid"));
      } else if (key === "r" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        loadAssessments();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /** Sign out */
  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) return;
    localStorage.removeItem("bearer_token");
    router.push("/");
  };

  /** Create new assessment → go straight to Edit (Details tab) */
  const handleCreate = async () => {
    if (!orgIdFromRoute) return;
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem("bearer_token");
      const resp = await fetch("/api/assessments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orgId: orgIdFromRoute,
          title: title.trim(),
          type,
          duration: duration.trim(),
          descriptionMd: desc.trim() || undefined,
          status: "Draft",
          isPublished: false,
        }),
      });

      if (resp.ok) {
        const created: Assessment = await resp.json();
        router.push(`/dashboard/organizations/${orgIdFromRoute}/assessments/${created.id}/edit`);
        return;
      } else {
        const t = await resp.text();
        console.error("Create assessment failed:", t);
        toast.error("Failed to create assessment");
      }
    } catch (e) {
      console.error("Create assessment error:", e);
      toast.error("Failed to create assessment");
    } finally {
      setSubmitting(false);
    }
  };

  // ----- Derived KPI & filtered/sorted list -----
  const withComputed = useMemo(() => {
    return assessments.map((a) => ({
      ...a,
      durationSec: parseDurationToSeconds(a.duration),
      publishedLike: a.isPublished || a.status?.toLowerCase() === "published",
    }));
  }, [assessments]);

  const kpis = useMemo(() => {
    const total = withComputed.length;
    const published = withComputed.filter((a) => a.publishedLike).length;
    const drafts = withComputed.filter((a) => !a.publishedLike).length;
    const secs = withComputed.map((a) => a.durationSec).filter(Boolean) as number[];
    const avgSec = secs.length ? Math.round(secs.reduce((s, v) => s + v, 0) / secs.length) : 0;
    const pctPublished = total ? Math.round((published / total) * 100) : 0;
    return { total, published, drafts, avgSec, pctPublished };
  }, [withComputed]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const within = (createdAt: string) => {
      if (timeFilter === "all") return true;
      const t = new Date(createdAt).getTime();
      const diff = now - t;
      const days = timeFilter === "7d" ? 7 : timeFilter === "30d" ? 30 : 90;
      return diff <= days * 24 * 3600 * 1000;
    };
    return withComputed
      .filter((a) => (statusFilter === "all" ? true : statusFilter === "published" ? a.publishedLike : !a.publishedLike))
      .filter((a) => (typeFilter === "all" ? true : a.type === typeFilter))
      .filter((a) => (linkFilter === "all" ? true : linkFilter === "linked" ? a.jobId != null : a.jobId == null))
      .filter((a) => {
        if (durationFilter === "all") return true;
        const m = (a.durationSec ?? 0) / 60;
        if (durationFilter === "short") return m <= 30;
        if (durationFilter === "medium") return m > 30 && m <= 60;
        return m > 60;
      })
      .filter((a) => within(a.createdAt))
      .filter((a) => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return true;
        return (
          a.title.toLowerCase().includes(q) ||
          (a.descriptionMd || "").toLowerCase().includes(q) ||
          (a.type || "").toLowerCase().includes(q)
        );
      });
  }, [withComputed, statusFilter, typeFilter, linkFilter, durationFilter, timeFilter, searchQuery]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      if (sortKey === "createdAt") {
        const d = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        return sortDir === "asc" ? d : -d;
      }
      if (sortKey === "title") {
        const d = a.title.localeCompare(b.title);
        return sortDir === "asc" ? d : -d;
      }
      if (sortKey === "duration") {
        const da = a.durationSec ?? 0;
        const db = b.durationSec ?? 0;
        return sortDir === "asc" ? da - db : db - da;
      }
      // status: Published before Draft
      const sa = (a.publishedLike ? 1 : 0) - (b.publishedLike ? 1 : 0);
      return sortDir === "asc" ? sa : -sa;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  // Small bits
  const statusPill = (a: { publishedLike: boolean; status: string }) =>
    a.publishedLike
      ? "bg-green-100 text-green-700"
      : "bg-yellow-100 text-yellow-700";

  const StatTile = ({
    icon: Icon,
    label,
    value,
    sub,
  }: { icon: any; label: string; value: number | string; sub?: string }) => (
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

  if (isPending || loadingOrg || loadingAssessments) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!session?.user) return null;

  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
      {/* Sidebar */}
      <CompanySidebar
        org={org}
        user={session.user || null}
        onSignOut={handleSignOut}
        onOpenSettings={() => setIsSettingsOpen(true)}
        active="assessments"
      />

      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto">
        <div className="p-8">
          <div className="max-w-6xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-4 mb-6">
              <nav className="flex items-center gap-2 text-sm">
                <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 transition-colors">
                  Dashboard
                </Link>
                <span className="text-gray-400">›</span>
                <span className="text-gray-900 font-medium">Assessments</span>
              </nav>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              <StatTile icon={ClipboardList} label="Total" value={kpis.total} />
              <StatTile icon={CheckCircle2} label="Published" value={kpis.published} />
              <StatTile icon={BookOpen} label="Drafts" value={kpis.drafts} />
              <StatTile icon={Clock} label="Avg Duration" value={formatMinutes(kpis.avgSec)} />
              <StatTile icon={Sparkles} label="% Published" value={`${kpis.pctPublished}%`} />
            </div>

            {/* Toolbar */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 sm:px-8 py-3">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {/* LEFT: chips + filters */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status chips */}
                      <div className="flex flex-wrap bg-gray-100 rounded-lg p-1">
                        {([
                          ["all", kpis.total, "All"],
                          ["published", kpis.published, "Published"],
                          ["draft", kpis.drafts, "Draft"],
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

                      {/* Filters */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Filter className="h-4 w-4 text-gray-400 hidden md:block" />

                        <Select value={typeFilter} onValueChange={(v: TypeFilter) => setTypeFilter(v)}>
                          <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All types</SelectItem>
                            <SelectItem value="MCQ">MCQ</SelectItem>
                            <SelectItem value="Coding">Coding</SelectItem>
                            <SelectItem value="Case Study">Case Study</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select value={linkFilter} onValueChange={(v: LinkFilter) => setLinkFilter(v)}>
                          <SelectTrigger className="w-40"><SelectValue placeholder="Link" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="linked">Linked to Job</SelectItem>
                            <SelectItem value="standalone">Standalone</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select value={durationFilter} onValueChange={(v: DurationFilter) => setDurationFilter(v)}>
                          <SelectTrigger className="w-40"><SelectValue placeholder="Duration" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any duration</SelectItem>
                            <SelectItem value="short">≤ 30 min</SelectItem>
                            <SelectItem value="medium">31–60 min</SelectItem>
                            <SelectItem value="long">&gt; 60 min</SelectItem>
                          </SelectContent>
                        </Select>

                        <Select value={timeFilter} onValueChange={(v: TimeFilter) => setTimeFilter(v)}>
                          <SelectTrigger className="w-36"><SelectValue placeholder="Time" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All time</SelectItem>
                            <SelectItem value="7d">Last 7 days</SelectItem>
                            <SelectItem value="30d">Last 30 days</SelectItem>
                            <SelectItem value="90d">Last 90 days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: search + sort + view + create */}
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center justify-start lg:justify-end gap-2 min-w-0">
                      {/* Search */}
                      <div className="relative w-full sm:w-72" title="Press / to focus">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          ref={searchRef}
                          placeholder="Search title, type, description"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>

                      {/* Sort */}
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
                          <DropdownMenuItem onClick={() => setSortKey("title")}>
                            Title {sortKey === "title" ? "•" : ""}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSortKey("duration")}>
                            Duration {sortKey === "duration" ? "•" : ""}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSortKey("status")}>
                            Status {sortKey === "status" ? "•" : ""}
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

                      {/* CTA */}
                      <Button onClick={() => setOpenNew(true)} className="bg-[#6a994e] hover:bg-[#5a8a3e] text-white">
                        + New Assessment
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CONTENT */}
            <div className="mt-4">
              {sorted.length === 0 ? (
                <div className="bg-white border rounded-lg p-12 text-center">
                  <div className="mx-auto mb-4 w-14 h-14 rounded-xl border border-dashed border-gray-300 flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold">No assessments match your filters</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Try adjusting filters, clearing search, or create a new assessment.
                  </p>
                  <div className="mt-6 flex items-center justify-center gap-2">
                    <Button variant="outline" onClick={() => { setSearchQuery(""); setStatusFilter("all"); setTypeFilter("all"); setLinkFilter("all"); setDurationFilter("all"); setTimeFilter("all"); }}>
                      Reset filters
                    </Button>
                    <Button onClick={() => setOpenNew(true)} className="bg-[#6a994e] hover:bg-[#5a8a3e] text-white">
                      Create Assessment
                    </Button>
                  </div>
                </div>
              ) : viewMode === "list" ? (
                <ul className="space-y-2 sm:space-y-3">
                  {sorted.map((a) => (
                    <li key={a.id} className="rounded-xl border border-gray-200 bg-white px-5 py-5 shadow-sm hover:shadow transition-shadow">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link href={`/dashboard/organizations/${orgIdFromRoute}/assessments/${a.id}`} className="block">
                            <div className="flex items-center gap-3">
                              <h3 className="text-sm font-medium text-gray-900 hover:text-[#6a994e] transition-colors truncate">
                                {a.title}
                              </h3>
                              <span className="text-xs text-gray-500">{a.type}</span>
                              {a.jobId ? (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Linked</span>
                              ) : (
                                <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Standalone</span>
                              )}
                            </div>
                          </Link>
                          <div className="mt-1 text-xs text-gray-500 flex flex-wrap items-center gap-2">
                            <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                            <span>•</span>
                            <span>{a.duration || "—"}</span>
                            {a.descriptionMd ? (
                              <>
                                <span>•</span>
                                <span className="truncate max-w-[420px]">{a.descriptionMd.replace(/\s+/g, " ").slice(0, 120)}{a.descriptionMd.length > 120 ? "…" : ""}</span>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusPill(a as any)}`}>
                            {a.publishedLike ? "Published" : "Draft"}
                          </span>
                          <div className="flex items-center gap-2">
                            <Button asChild variant="outline" size="sm" className="text-xs">
                              <Link href={`/dashboard/organizations/${orgIdFromRoute}/assessments/${a.id}`}>View</Link>
                            </Button>
                            <Button asChild variant="outline" size="sm" className="text-xs">
                              <Link href={`/dashboard/organizations/${orgIdFromRoute}/assessments/${a.id}/edit`}>Edit</Link>
                            </Button>
                            <Button asChild variant="outline" size="sm" className="text-xs">
                              <Link href={`/dashboard/organizations/${orgIdFromRoute}/assessments/${a.id}/results`}>Results</Link>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sorted.map((a) => (
                    <div key={a.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow transition-shadow">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link href={`/dashboard/organizations/${orgIdFromRoute}/assessments/${a.id}`}>
                            <h3 className="text-sm font-medium text-gray-900 hover:text-[#6a994e] transition-colors truncate">
                              {a.title}
                            </h3>
                          </Link>
                          <div className="text-[11px] text-gray-500 mt-1">
                            {new Date(a.createdAt).toLocaleDateString()} • {a.type} • {a.duration || "—"}
                          </div>
                          <div className="mt-1">
                            {a.jobId ? (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">Linked</span>
                            ) : (
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Standalone</span>
                            )}
                          </div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusPill(a as any)}`}>
                          {a.publishedLike ? "Published" : "Draft"}
                        </span>
                      </div>

                      {a.descriptionMd ? (
                        <p className="mt-3 text-xs text-gray-600 line-clamp-3">
                          {a.descriptionMd.replace(/\s+/g, " ")}
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button asChild variant="outline" size="sm" className="text-xs">
                          <Link href={`/dashboard/organizations/${orgIdFromRoute}/assessments/${a.id}`}>View</Link>
                        </Button>
                        <Button asChild variant="outline" size="sm" className="text-xs">
                          <Link href={`/dashboard/organizations/${orgIdFromRoute}/assessments/${a.id}/edit`}>Edit</Link>
                        </Button>
                        <Button asChild variant="outline" size="sm" className="text-xs">
                          <Link href={`/dashboard/organizations/${orgIdFromRoute}/assessments/${a.id}/results`}>Results</Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Footer: last refreshed */}
              {lastRefreshedAt ? (
                <div className="text-[11px] text-gray-500 mt-4 text-right">
                  Refreshed {lastRefreshedAt.toLocaleTimeString()}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Command palette */}
        <CommandPalette isOpen={isCommandPaletteOpen} onClose={closeCommandPalette} orgId={org?.id} />

        {/* Settings modal */}
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          organization={org ? { id: org.id, name: org.name, slug: "", type: "company", plan: "free", seatLimit: 5, createdAt: "", updatedAt: "" } : null}
        />
      </main>

      {/* Create Assessment Modal */}
      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Assessment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g., General Aptitude v1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MCQ">MCQ</SelectItem>
                    <SelectItem value="Coding">Coding</SelectItem>
                    <SelectItem value="Case Study">Case Study</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration</Label>
                <Input
                  id="duration"
                  placeholder="e.g., 30 min"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="desc">Description (optional)</Label>
              <Input
                id="desc"
                placeholder="Short description (Markdown allowed)"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button variant="ghost" onClick={() => setOpenNew(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting || !title.trim() || !orgIdFromRoute}>
              {submitting ? "Creating..." : "Create & edit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
