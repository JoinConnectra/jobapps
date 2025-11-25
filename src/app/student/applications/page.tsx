"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { absoluteUrl } from "@/lib/url";
import {
  ArrowUpDown,
  BadgeCheck,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  Circle,
  Download,
  Filter,
  Loader2,
  Search,
  Sparkles,
  Waypoints,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

/** ----------------------------- Types ----------------------------- */
type Stage =
  | "applied"
  | "submitted"
  | "in_review"
  | "assessment"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

type Application = {
  id: number;
  jobId: number | null;
  jobTitle?: string | null;
  organizationName?: string | null;
  locationMode?: string | null; // Onsite/Hybrid/Remote
  appliedAt?: string | null;
  updatedAt?: string | null;
  stage?: Stage;
  source?: string | null;
  salaryRange?: string | null;
  tags?: string[]; // optional custom labels
  // Optional API-expanded fields (defensive)
  job?:
    | {
        id: number;
        title: string | null;
        locationMode?: string | null;
        salaryRange?: string | null;
        organization?: { name?: string | null } | null;
      }
    | null;
};

type ServerListResponse = {
  items: Application[];
  nextCursor?: string | null;
  // allow flexible shapes
  [key: string]: any;
};

/** ----------------------------- Helpers ----------------------------- */
const STAGE_META: Record<
  Stage,
  {
    label: string;
    tone:
      | "default"
      | "secondary"
      | "destructive"
      | "outline"
      | "success"
      | "warning";
    icon: React.ElementType;
  }
> = {
  applied: { label: "Submitted", tone: "secondary", icon: Waypoints },
  submitted: { label: "Submitted", tone: "secondary", icon: Waypoints },
  in_review: { label: "In Review", tone: "default", icon: BadgeCheck },
  assessment: { label: "Assessment", tone: "warning", icon: ArrowUpDown },
  interview: { label: "Interview", tone: "success", icon: Calendar },
  offer: { label: "Offer", tone: "success", icon: Check },
  rejected: { label: "Rejected", tone: "destructive", icon: X },
  withdrawn: { label: "Withdrawn", tone: "outline", icon: Circle },
};

function toCsv(rows: Record<string, any>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: any) =>
    v == null ? "" : String(v).replace(/"/g, '""');
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => `"${esc(r[h])}"`).join(",")),
  ];
  return lines.join("\n");
}

function normalize(app: Application): Application {
  // Fill jobTitle/org from nested `job` if present
  const jobTitle = app.jobTitle ?? app.job?.title ?? null;
  const organizationName =
    app.organizationName ?? app.job?.organization?.name ?? null;
  const locationMode = app.locationMode ?? app.job?.locationMode ?? null;
  const salaryRange = app.salaryRange ?? app.job?.salaryRange ?? null;
  return { ...app, jobTitle, organizationName, locationMode, salaryRange };
}

/** ----------------------------- Inner Page ----------------------------- */
function ApplicationsPageInner() {
  const router = useRouter();
  const params = useSearchParams();

  // UI state
  const [query, setQuery] = useState<string>(params.get("q") ?? "");
  const [stageFilter, setStageFilter] = useState<Stage | "all">(
    (params.get("stage") as Stage) ?? "all"
  );
  const [onlyActive, setOnlyActive] = useState<boolean>(
    params.get("active") === "1"
  );
  const [sortKey, setSortKey] = useState<
    "updated" | "applied" | "stage" | "company" | "title"
  >((params.get("sort") as any) ?? "updated");
  const [sortDir, setSortDir] = useState<"desc" | "asc">(
    (params.get("dir") as any) ?? "desc"
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [items, setItems] = useState<Application[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const observerRef = useRef<HTMLDivElement | null>(null);

  // Fetch initial data
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = await absoluteUrl(
        `/api/student/applications?mine=1&limit=25&include=job,organization`
      );
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok)
        throw new Error(`Failed to load applications (${res.status})`);
      const data: ServerListResponse | Application[] = await res.json();
      const list = Array.isArray(data) ? data : data.items ?? [];
      const next = Array.isArray(data) ? null : data.nextCursor ?? null;
      setItems(list.map(normalize));
      setCursor(next);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, []);

  // Load more for infinite scroll
  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const url = await absoluteUrl(
        `/api/student/applications?mine=1&limit=25&cursor=${encodeURIComponent(
          cursor
        )}&include=job,organization`
      );
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to load more (${res.status})`);
      const data: ServerListResponse | Application[] = await res.json();
      const list = Array.isArray(data) ? data : data.items ?? [];
      const next = Array.isArray(data) ? null : data.nextCursor ?? null;
      setItems((prev) => [...prev, ...list.map(normalize)]);
      setCursor(next);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Failed to load more");
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore]);

  useEffect(() => {
    load();
  }, [load]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!observerRef.current) return;
    const el = observerRef.current;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "800px 0px 0px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  // Derived filtered + sorted list
  const filtered = useMemo(() => {
    let list = [...items];

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((a) => {
        const fields = [
          a.jobTitle ?? "",
          a.organizationName ?? "",
          a.source ?? "",
          a.salaryRange ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return fields.includes(q);
      });
    }

    if (stageFilter !== "all") {
      list = list.filter((a) => a.stage === stageFilter);
    }

    if (onlyActive) {
      list = list.filter(
        (a) => !["rejected", "withdrawn"].includes(a.stage ?? "submitted")
      );
    }

    list.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortKey) {
        case "applied": {
          const va = a.appliedAt ? +new Date(a.appliedAt) : 0;
          const vb = b.appliedAt ? +new Date(b.appliedAt) : 0;
          return (va - vb) * dir;
        }
        case "updated": {
          const va = a.updatedAt ? +new Date(a.updatedAt) : 0;
          const vb = b.updatedAt ? +new Date(b.updatedAt) : 0;
          return (va - vb) * dir;
        }
        case "stage":
          return ((a.stage ?? "").localeCompare(b.stage ?? "")) * dir;
        case "company":
          return (
            (a.organizationName ?? "").localeCompare(
              b.organizationName ?? ""
            ) * dir
          );
        case "title":
          return (
            (a.jobTitle ?? "").localeCompare(b.jobTitle ?? "") * dir
          );
        default:
          return 0;
      }
    });

    return list;
  }, [items, query, stageFilter, onlyActive, sortKey, sortDir]);

  // Counters for tabs
  const counts = useMemo(() => {
    const tally = {
      all: items.length,
      submitted: 0,
      in_review: 0,
      assessment: 0,
      interview: 0,
      offer: 0,
      rejected: 0,
      withdrawn: 0,
      active: 0,
    } as Record<string, number>;

    for (const a of items) {
      const st = (a.stage ?? "submitted") as Stage;
      tally[st] = (tally[st] ?? 0) + 1;
      if (!["rejected", "withdrawn"].includes(st)) tally.active++;
    }
    return tally;
  }, [items]);

  // Selection
  const toggleSelect = (id: number) =>
    setSelected((s) => {
      const copy = new Set(s);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });

  const clearSelection = () => setSelected(new Set());
  const selectAllVisible = () =>
    setSelected(new Set(filtered.map((x) => x.id)));

  // Bulk actions (client-only placeholders; wire to API if you like)
  const bulkWithdraw = () => {
    if (!selected.size) return;
    toast.message("Withdraw (preview)", {
      description:
        "Hook this to /api/applications/[id]/withdraw. For now, this is a UI action.",
    });
    clearSelection();
  };
  const bulkTag = () => {
    if (!selected.size) return;
    toast.message("Bulk tag (preview)", {
      description:
        "Attach custom tags to your selected applications. Wire to a tags table if desired.",
    });
  };

  // CSV Export
  const exportCsv = () => {
    const rows = filtered.map((a) => ({
      id: a.id,
      job_title: a.jobTitle ?? "",
      company: a.organizationName ?? "",
      stage: a.stage ?? "",
      applied_at: a.appliedAt ?? "",
      last_update: a.updatedAt ?? "",
      location_mode: a.locationMode ?? "",
      salary_range: a.salaryRange ?? "",
      source: a.source ?? "",
    }));
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const ael = document.createElement("a");
    ael.href = url;
    ael.download = `applications_${dayjs().format("YYYYMMDD_HHmm")}.csv`;
    ael.click();
    URL.revokeObjectURL(url);
  };

  // Persist URL params (nice for shareable views)
  useEffect(() => {
    const sp = new URLSearchParams();
    if (query) sp.set("q", query);
    if (stageFilter !== "all") sp.set("stage", stageFilter);
    if (onlyActive) sp.set("active", "1");
    sp.set("sort", sortKey);
    sp.set("dir", sortDir);
    const qs = sp.toString();
    const href = qs
      ? `/student/applications?${qs}`
      : `/student/applications`;
    window.history.replaceState(null, "", href);
  }, [query, stageFilter, onlyActive, sortKey, sortDir]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Applications
          </h1>
          <p className="text-sm text-muted-foreground">
            Track your progress, interviews, and offers — all in one
            place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!!selected.size && (
            <Button variant="outline" onClick={clearSelection}>
              Clear ({selected.size})
            </Button>
          )}
          <Button onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Smart Stats */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Sparkles}
          title="Active"
          value={counts.active}
          hint="(excludes rejected/withdrawn)"
        />
        <StatCard
          icon={Briefcase}
          title="Interviews"
          value={counts.interview}
        />
        <StatCard icon={Check} title="Offers" value={counts.offer} />
        <StatCard
          icon={BadgeCheck}
          title="In Review"
          value={counts.in_review}
        />
      </div>

      {/* Filters Row */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by role, company, salary, or source…"
              className="pl-9"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                Filters
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Quick filters</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={onlyActive}
                onCheckedChange={(v) => setOnlyActive(Boolean(v))}
              >
                Only active pipelines
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              {([
                ["updated", "Last update"],
                ["applied", "Applied date"],
                ["company", "Company"],
                ["title", "Job title"],
                ["stage", "Stage"],
              ] as const).map(([key, label]) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => setSortKey(key as typeof sortKey)}
                >
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  {label} {sortKey === key ? `(${sortDir})` : ""}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  setSortDir((d) => (d === "desc" ? "asc" : "desc"))
                }
              >
                Toggle direction ({sortDir})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {!!selected.size && (
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="outline" onClick={bulkTag}>
              Add Tag
            </Button>
            <Button variant="destructive" onClick={bulkWithdraw}>
              Withdraw Selected
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        defaultValue="all"
        value={stageFilter === "all" ? "all" : stageFilter}
        onValueChange={(v) => setStageFilter(v as Stage | "all")}
      >
        <TabsList className="flex w-full flex-wrap">
          <Tab value="all" label={`All (${counts.all})`} />
          <Tab
            value="in_review"
            label={`In Review (${counts.in_review})`}
          />
          <Tab
            value="assessment"
            label={`Assessment (${counts.assessment})`}
          />
          <Tab
            value="interview"
            label={`Interviews (${counts.interview})`}
          />
          <Tab value="offer" label={`Offers (${counts.offer})`} />
          <Tab
            value="submitted"
            label={`Submitted (${counts.submitted})`}
          />
          <Tab
            value="rejected"
            label={`Rejected (${counts.rejected})`}
          />
          <Tab
            value="withdrawn"
            label={`Withdrawn (${counts.withdrawn})`}
          />
        </TabsList>

        <TabsContent
          value={stageFilter === "all" ? "all" : stageFilter}
          className="mt-4"
        >
          {/* Table / Card grid */}
          {loading ? (
            <LoadingList />
          ) : filtered.length === 0 ? (
            <EmptyState
              onReset={() => {
                setQuery("");
                setStageFilter("all");
                setOnlyActive(false);
              }}
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((a) => (
                <ApplicationCard
                  key={a.id}
                  app={a}
                  selected={selected.has(a.id)}
                  onToggle={() => toggleSelect(a.id)}
                  onOpen={(id) =>
                    router.push(`/student/applications/${id}`)
                  }
                />
              ))}
            </div>
          )}

          {/* Infinite sentinel */}
          <div ref={observerRef} className="h-1 w-full" />
          {loadingMore && (
            <div className="mt-4 flex items-center justify-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Loading more…
              </span>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** ----------------------------- Small Components ----------------------------- */

function StatCard(props: {
  icon: React.ElementType;
  title: string;
  value: number | string;
  hint?: string;
}) {
  const Icon = props.icon;
  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {props.title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{props.value}</div>
        {props.hint && (
          <p className="text-xs text-muted-foreground">{props.hint}</p>
        )}
      </CardContent>
    </Card>
  );
}

function Tab({ value, label }: { value: string; label: string }) {
  return (
    <TabsTrigger
      value={value}
      className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
    >
      {label}
    </TabsTrigger>
  );
}

function LoadingList() {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="rounded-2xl">
          <CardContent className="space-y-3 p-5">
            <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <Card className="rounded-2xl border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-3 p-10 text-center">
        <Sparkles className="h-8 w-8 text-muted-foreground" />
        <h3 className="text-lg font-semibold">
          No applications match your filters
        </h3>
        <p className="text-sm text-muted-foreground">
          Try clearing filters or searching with a different term.
        </p>
        <Button variant="outline" onClick={onReset}>
          Reset filters
        </Button>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ stage }: { stage?: Stage }) {
  const meta =
    stage && STAGE_META[stage] ? STAGE_META[stage] : STAGE_META.submitted;
  const Icon = meta.icon;
  const variant =
    meta.tone === "success"
      ? "default"
      : meta.tone === "destructive"
      ? "destructive"
      : meta.tone === "warning"
      ? "secondary"
      : meta.tone === "outline"
      ? "outline"
      : "secondary";
  return (
    <Badge variant={variant as any} className="gap-1">
      <Icon className="h-3.5 w-3.5" />
      {meta.label}
    </Badge>
  );
}

function ApplicationCard({
  app,
  selected,
  onToggle,
  onOpen,
}: {
  app: Application;
  selected: boolean;
  onToggle: () => void;
  onOpen: (id: number) => void;
}) {
  const company = app.organizationName ?? "—";
  const title = app.jobTitle ?? "Untitled role";
  const when = app.updatedAt ?? app.appliedAt ?? null;

  return (
    <Card className="group rounded-2xl border hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        {/* Top row */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <input
                aria-label="select application"
                type="checkbox"
                checked={selected}
                onChange={onToggle}
                className="h-4 w-4 rounded border-muted-foreground/30"
              />
              <h3 className="truncate text-base font-semibold">
                {title}
              </h3>
            </div>
            <p className="truncate text-sm text-muted-foreground">
              {company}
              {app.locationMode ? ` • ${app.locationMode}` : ""}
              {app.salaryRange ? ` • ${app.salaryRange}` : ""}
            </p>
          </div>
          <StatusBadge stage={app.stage} />
        </div>

        {/* Middle meta */}
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {app.source && (
            <Badge variant="outline">Source: {app.source}</Badge>
          )}
          {app.tags?.map((t) => (
            <Badge key={t} variant="outline">
              {t}
            </Badge>
          ))}
          {when && <span>Updated {dayjs(when).fromNow()}</span>}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button className="w-full" onClick={() => onOpen(app.id)}>
            View
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-12 px-0">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => onOpen(app.id)}>
                Open
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toast.success("Reminder added")}
              >
                Add Reminder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => toast("Withdraw (preview)")}
              >
                Withdraw
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

/** ----------------------------- Suspense Wrapper ----------------------------- */

export default function ApplicationsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <ApplicationsPageInner />
    </Suspense>
  );
}
