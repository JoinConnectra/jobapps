"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import Link from "next/link";

import UniversityDashboardShell from "@/components/university/UniversityDashboardShell";
import { EventItem } from "@/components/events/types";
import { useSession } from "@/lib/auth-client";

import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Filter,
  Search,
  Plus,
  CalendarDays,
  LayoutGrid,
  List as ListIcon,
  ArrowUpDown,
  X,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EventCard } from "@/components/events/EventCard";
import { UniversityEventCard } from "./_components/UniversityEventCard";

// -------------------------------------------------
// Types / helpers
// -------------------------------------------------
type ViewMode = "grid" | "list";
type SortKey = "soonest" | "mostPopular" | "featured";
type HostFilter = "ANY" | "EMPLOYER" | "CAREER_CENTER";

function isToday(d: Date) {
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

function isWithinDays(d: Date, days: number) {
  const now = new Date();
  const limit = new Date();
  limit.setDate(now.getDate() + days);
  return d >= now && d <= limit;
}

type UniFilters = {
  host: HostFilter;
  medium: "ANY" | "VIRTUAL" | "IN_PERSON";
  dateRange: "ANY" | "UPCOMING" | "THIS_WEEK" | "THIS_MONTH";
  featuredOnly: boolean;
};

const defaultFilters: UniFilters = {
  host: "ANY",
  medium: "ANY",
  dateRange: "UPCOMING",
  featuredOnly: false,
};

export default function UniversityEventsPage() {
  const { data: session } = useSession();

  const [orgId, setOrgId] = useState<number | null>(null);

  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<UniFilters>(defaultFilters);
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<SortKey>("soonest");

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<EventItem[]>([]);

  // Resolve university org from session or /api/organizations
  useEffect(() => {
    const sid = (session as any)?.user?.org_id ?? null;
    setOrgId(sid ? Number(sid) : null);
  }, [session]);

  useEffect(() => {
    if (orgId) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch("/api/organizations?mine=true");
        if (!resp.ok) return;
        const orgs = await resp.json();
        const uni = Array.isArray(orgs)
          ? orgs.find((o: any) => o?.type === "university")
          : null;
        if (!cancelled && uni?.id) {
          setOrgId(Number(uni.id));
        }
      } catch {
        // no-op
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  // Build query string for /api/university/events GET
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (filters.dateRange === "UPCOMING") params.set("status", "upcoming");
    else params.set("status", "all");
    return params.toString();
  }, [q, filters.dateRange]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = orgId
        ? `/api/university/events?orgId=${orgId}&${queryString}`
        : `/api/university/events?${queryString}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, queryString]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => ({ all: items.length }), [items]);

  const featured = useMemo(() => {
    return items
      .filter((e) => !!e.featured)
      .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
      .slice(0, 8);
  }, [items]);

  const filtered: EventItem[] = useMemo(() => {
    const text = q.trim().toLowerCase();
    let list = items.slice();

    // text search (title/description/location/tags)
    if (text) {
      list = list.filter((ev) => {
        const hay = `${ev.title} ${(ev.description ?? "")} ${
          ev.location ?? ""
        } ${(ev.tags ?? []).join(" ")}`.toLowerCase();
        return hay.includes(text);
      });
    }

    // host filter
    if (filters.host === "EMPLOYER") {
      list = list.filter((ev) => !!(ev as any).is_employer_hosted);
    } else if (filters.host === "CAREER_CENTER") {
      list = list.filter((ev) => !(ev as any).is_employer_hosted);
    }

    // medium filter
    if (filters.medium !== "ANY") {
      list = list.filter(
        (ev) => (ev.medium ?? "IN_PERSON") === filters.medium,
      );
    }

    // date windows
    if (filters.dateRange === "THIS_WEEK") {
      list = list.filter((ev) => isWithinDays(new Date(ev.startsAt), 7));
    } else if (filters.dateRange === "THIS_MONTH") {
      const now = new Date();
      const startOfNextMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1,
      );
      list = list.filter((ev) => {
        const d = new Date(ev.startsAt);
        return d >= now && d < startOfNextMonth;
      });
    }

    if (filters.featuredOnly) {
      list = list.filter((ev) => !!ev.featured);
    }

    // sort
    if (sort === "soonest") {
      list.sort(
        (a, b) => +new Date(a.startsAt) - +new Date(b.startsAt),
      );
    } else if (sort === "mostPopular") {
      const ac = (e: EventItem) =>
        (e as any).reg_count ?? (e as any).attendees_count ?? 0;
      list.sort((a, b) => ac(b) - ac(a));
    } else if (sort === "featured") {
      list.sort(
        (a, b) => Number(!!b.featured) - Number(!!a.featured),
      );
    }

    return list;
  }, [q, filters, sort, items]);

  const { today, thisWeek, later } = useMemo(() => {
    const t: EventItem[] = [];
    const w: EventItem[] = [];
    const l: EventItem[] = [];
    filtered.forEach((ev) => {
      const d = new Date(ev.startsAt);
      if (isToday(d)) t.push(ev);
      else if (isWithinDays(d, 7)) w.push(ev);
      else l.push(ev);
    });
    return { today: t, thisWeek: w, later: l };
  }, [filtered]);

  return (
    <UniversityDashboardShell title="Events">
      {/* Top actions row */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Dashboard</span>
          <span className="mx-1">›</span>
          <span>Events</span>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            asChild
            disabled={!orgId}
            title={
              !orgId
                ? "Resolving your university organization…"
                : undefined
            }
          >
            <Link href="/university/dashboard/events/new">
              <Plus className="mr-2 h-4 w-4" />
              New Event
            </Link>
          </Button>
        </div>
      </div>

      {/* Sticky toolbar (search / filters / view toggle) */}
      <Card className="sticky top-2 z-10 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Browse</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Search + Sort + View */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search title, location, or tag…"
                className="w-[340px] pl-8"
              />
              {q && (
                <button
                  onClick={() => setQ("")}
                  className="absolute right-2 top-2.5 hover:text-foreground text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <DropdownSort sort={sort} setSort={setSort} />

            {/* View toggle */}
            <div className="ml-1 flex rounded-md border">
              <Button
                variant={view === "grid" ? "default" : "ghost"}
                onClick={() => setView("grid")}
                className="rounded-none"
                title="Grid"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={view === "list" ? "default" : "ghost"}
                onClick={() => setView("list")}
                className="rounded-none"
                title="List"
              >
                <ListIcon className="h-4 w-4" />
              </Button>
            </div>

            <Button
              variant="outline"
              onClick={() => setFilters(defaultFilters)}
            >
              <Filter className="mr-2 h-4 w-4" />
              Reset Filters
            </Button>
          </div>

          {/* Tabs (only All for now) */}
          <Tabs value="all">
            <TabsList className="grid grid-cols-1">
              <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>

        {/* Quick filter chips */}
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-2">
            <QuickChip
              active={filters.host === "CAREER_CENTER"}
              onClick={() =>
                setFilters({
                  ...filters,
                  host:
                    filters.host === "CAREER_CENTER"
                      ? "ANY"
                      : "CAREER_CENTER",
                })
              }
              label="Career center"
            />
            <QuickChip
              active={filters.host === "EMPLOYER"}
              onClick={() =>
                setFilters({
                  ...filters,
                  host:
                    filters.host === "EMPLOYER" ? "ANY" : "EMPLOYER",
                })
              }
              label="Employer hosted"
            />
            <QuickChip
              active={filters.medium === "VIRTUAL"}
              onClick={() =>
                setFilters({
                  ...filters,
                  medium:
                    filters.medium === "VIRTUAL" ? "ANY" : "VIRTUAL",
                })
              }
              label="Virtual"
            />
            <QuickChip
              active={filters.dateRange === "THIS_WEEK"}
              onClick={() =>
                setFilters({
                  ...filters,
                  dateRange:
                    filters.dateRange === "THIS_WEEK"
                      ? "ANY"
                      : "THIS_WEEK",
                })
              }
              label="This week"
            />
            <QuickChip
              active={filters.featuredOnly}
              onClick={() =>
                setFilters({
                  ...filters,
                  featuredOnly: !filters.featuredOnly,
                })
              }
              label="Featured"
            />
          </div>
        </CardContent>
      </Card>

      {/* Featured strip */}
      {featured.length > 0 && (
        <section className="mt-4">
          <div className="mb-2 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Featured this month</h2>
          </div>
          <div className="no-scrollbar flex overflow-x-auto gap-3 pb-1 snap-x">
            {featured.map((ev) => (
              <div
                key={ev.id}
                className="min-w-[320px] max-w-[360px] flex-[0_0_auto] snap-start"
              >
                <Link
                  href={`/university/dashboard/events/${ev.id}`}
                  className="block h-full"
                >
                  <EventCard event={ev} />
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Buckets */}
      <section className="mt-4 space-y-6">
        <Bucket title="Today" items={today} view={view} />
        <Bucket title="This week" items={thisWeek} view={view} />
        <Bucket title="Later" items={later} view={view} />
        {today.length + thisWeek.length + later.length === 0 && (
          <EmptyState
            title={loading ? "Loading…" : "No events match your filters"}
          />
        )}
      </section>
    </UniversityDashboardShell>
  );
}

// -----------------------------
// Small helpers
// -----------------------------

function DropdownSort({
  sort,
  setSort,
}: {
  sort: SortKey;
  setSort: (s: SortKey) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <ArrowUpDown className="mr-2 h-4 w-4" />
          {sort === "soonest"
            ? "Soonest first"
            : sort === "mostPopular"
            ? "Most popular"
            : "Featured first"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setSort("soonest")}>
          Soonest first
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setSort("mostPopular")}>
          Most popular
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setSort("featured")}>
          Featured first
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function QuickChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1 text-xs transition",
        active
          ? "bg-primary text-primary-foreground"
          : "hover:bg-accent",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function Bucket({
  title,
  items,
  view,
}: {
  title: string;
  items: EventItem[];
  view: ViewMode;
}) {
  if (!items || items.length === 0) return null;
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
        {title}
      </h3>
      <div
        className={
          view === "grid"
            ? "grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-[1fr] items-stretch"
            : "grid grid-cols-1 gap-3"
        }
      >
        {items.map((ev) => (
          <div key={ev.id} className={view === "list" ? "" : "h-full"}>
            <UniversityEventCard event={ev} />
          </div>
        ))}
      </div>
    </section>
  );
}

function EmptyState({ title }: { title: string }) {
  return (
    <div className="rounded-lg border bg-card text-card-foreground p-10 text-center">
      <p className="text-base font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Try adjusting search, sort, or quick filters.
      </p>
    </div>
  );
}
