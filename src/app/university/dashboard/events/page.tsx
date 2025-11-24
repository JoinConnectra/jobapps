// src/app/university/dashboard/events/page.tsx
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Search,
  Plus,
  CalendarDays,
  LayoutGrid,
  List as ListIcon,
  ArrowUpDown,
  X,
  Users,
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

function isCareerFairLike(ev: EventItem) {
  const title = (ev.title || "").toLowerCase();
  const tagStr = Array.isArray(ev.tags)
    ? ev.tags.join(" ").toLowerCase()
    : "";

  // Heuristic: catch "career fair", "job fair", "expo", etc.
  return (
    title.includes("career fair") ||
    title.includes("job fair") ||
    title.includes("career day") ||
    title.includes("expo") ||
    tagStr.includes("career fair") ||
    tagStr.includes("job fair") ||
    tagStr.includes("career_fair") ||
    tagStr.includes("career-day")
  );
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

  // Core KPIs only
  const kpis = useMemo(() => {
    const now = new Date();

    const upcomingEvents = items.filter((ev) => {
      const d = new Date((ev as any).startsAt);
      return d >= now;
    });

    const thisMonthEvents = items.filter((ev) => {
      const d = new Date((ev as any).startsAt);
      const sameYear = d.getFullYear() === now.getFullYear();
      const sameMonth = d.getMonth() === now.getMonth();
      return d >= now && sameYear && sameMonth;
    });

    const careerFairEvents = items.filter((ev) => isCareerFairLike(ev));

    return {
      totalEvents: items.length,
      upcomingEvents: upcomingEvents.length,
      thisMonthEvents: thisMonthEvents.length,
      careerFairEvents: careerFairEvents.length,
    };
  }, [items]);

  const featured = useMemo(() => {
    return items
      .filter((e: any) => !!e.featured)
      .sort(
        (a, b) =>
          +new Date((a as any).startsAt) -
          +new Date((b as any).startsAt)
      )
      .slice(0, 8);
  }, [items]);

  // Career fairs / major events strip
  const careerFairs = useMemo(() => {
    return items
      .filter((ev) => isCareerFairLike(ev))
      .sort(
        (a, b) =>
          +new Date((a as any).startsAt) -
          +new Date((b as any).startsAt)
      )
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
        (ev) => (ev.medium ?? "IN_PERSON") === filters.medium
      );
    }

    // date windows
    if (filters.dateRange === "THIS_WEEK") {
      list = list.filter((ev) =>
        isWithinDays(new Date((ev as any).startsAt), 7)
      );
    } else if (filters.dateRange === "THIS_MONTH") {
      const now = new Date();
      const startOfNextMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1
      );
      list = list.filter((ev) => {
        const d = new Date((ev as any).startsAt);
        return d >= now && d < startOfNextMonth;
      });
    }

    if (filters.featuredOnly) {
      list = list.filter((ev: any) => !!ev.featured);
    }

    // sort
    if (sort === "soonest") {
      list.sort(
        (a, b) =>
          +new Date((a as any).startsAt) -
          +new Date((b as any).startsAt)
      );
    } else if (sort === "mostPopular") {
      const ac = (e: EventItem) =>
        (e as any).reg_count ?? (e as any).attendees_count ?? 0;
      list.sort((a, b) => ac(b) - ac(a));
    } else if (sort === "featured") {
      list.sort(
        (a, b) =>
          Number(!!(b as any).featured) -
          Number(!!(a as any).featured)
      );
    }

    return list;
  }, [q, filters, sort, items]);

  const { today, thisWeek, later } = useMemo(() => {
    const t: EventItem[] = [];
    const w: EventItem[] = [];
    const l: EventItem[] = [];
    filtered.forEach((ev) => {
      const d = new Date((ev as any).startsAt);
      if (isToday(d)) t.push(ev);
      else if (isWithinDays(d, 7)) w.push(ev);
      else l.push(ev);
    });
    return { today: t, thisWeek: w, later: l };
  }, [filtered]);

  const totalFiltered =
    today.length + thisWeek.length + later.length;

  const handleClearFilters = useCallback(() => {
    setFilters(defaultFilters);
    setQ("");
  }, []);

  return (
    <UniversityDashboardShell title="Events">
      <div className="space-y-4">
        {/* Top row: breadcrumb + search + New Event */}
        <div className="mb-2 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="text-xs md:text-sm text-muted-foreground">
            <span className="font-medium">Dashboard</span>
            <span className="mx-1">›</span>
            <span>Events</span>
          </div>
          <div className="flex w-full max-w-md items-center gap-2 md:justify-end">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search title, location, or tag…"
                  className="pl-8"
                />
                {q && (
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
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
                New event
              </Link>
            </Button>
          </div>
        </div>

        {/* KPI row — only the important ones */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Total events
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-semibold text-slate-900">
                {kpis.totalEvents}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Hosted or shared with your students
              </p>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Upcoming events
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-semibold text-slate-900">
                {kpis.upcomingEvents}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Still ahead on the calendar
              </p>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                This month
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-semibold text-slate-900">
                {kpis.thisMonthEvents}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Events still to come this month
              </p>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-2">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Career fairs & expos
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-semibold text-slate-900">
                {kpis.careerFairEvents}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Major recruiting touchpoints
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main content card: summary + filters */}
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-base md:text-lg text-slate-900">
                Events for your students
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                All events targeted to this university, with tools to
                highlight gaps and key recruiting moments.
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
                  {kpis.totalEvents}
                </span>{" "}
                events.
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-3 text-[11px]"
                onClick={handleClearFilters}
              >
                Clear filters
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {/* Filters block (aligned with jobs/students pattern) */}
            <div className="mb-1 rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm">
              <div className="mb-2 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Filters
                </span>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="font-medium uppercase tracking-wide">
                    Sort by
                  </span>
                  <DropdownSort sort={sort} setSort={setSort} />

                  {/* View toggle */}
                  <div className="ml-1 flex rounded-md border">
                    <Button
                      type="button"
                      variant={view === "grid" ? "default" : "ghost"}
                      onClick={() => setView("grid")}
                      className="rounded-none h-7 px-2"
                      title="Grid"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={view === "list" ? "default" : "ghost"}
                      onClick={() => setView("list")}
                      className="rounded-none h-7 px-2"
                      title="List"
                    >
                      <ListIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Quick filters as chips */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <QuickChip
                  active={filters.host === "CAREER_CENTER"}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      host:
                        prev.host === "CAREER_CENTER"
                          ? "ANY"
                          : "CAREER_CENTER",
                    }))
                  }
                  label="Career center hosted"
                />
                <QuickChip
                  active={filters.host === "EMPLOYER"}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      host:
                        prev.host === "EMPLOYER" ? "ANY" : "EMPLOYER",
                    }))
                  }
                  label="Employer hosted"
                />
                <QuickChip
                  active={filters.medium === "VIRTUAL"}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      medium:
                        prev.medium === "VIRTUAL" ? "ANY" : "VIRTUAL",
                    }))
                  }
                  label="Virtual"
                />
                <QuickChip
                  active={filters.dateRange === "THIS_WEEK"}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      dateRange:
                        prev.dateRange === "THIS_WEEK"
                          ? "ANY"
                          : "THIS_WEEK",
                    }))
                  }
                  label="This week"
                />
                <QuickChip
                  active={filters.dateRange === "THIS_MONTH"}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      dateRange:
                        prev.dateRange === "THIS_MONTH"
                          ? "ANY"
                          : "THIS_MONTH",
                    }))
                  }
                  label="This month"
                />
                <QuickChip
                  active={filters.featuredOnly}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      featuredOnly: !prev.featuredOnly,
                    }))
                  }
                  label="Featured only"
                />
              </div>
            </div>

            {/* If no events after filter, defer to EmptyState below buckets */}
          </CardContent>
        </Card>

        {/* Featured strip */}
        {featured.length > 0 && (
          <section className="mt-2">
            <div className="mb-2 flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">
                Featured this month
              </h2>
            </div>
            <div className="no-scrollbar flex overflow-x-auto gap-3 pb-1 snap-x">
              {featured.map((ev: any) => (
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

        {/* Career fairs / major events strip */}
        {careerFairs.length > 0 && (
          <section className="mt-4">
            <div className="mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">
                Career fairs & major events
              </h2>
            </div>
            <div className="no-scrollbar flex overflow-x-auto gap-3 pb-1 snap-x">
              {careerFairs.map((ev: any) => (
                <div
                  key={ev.id}
                  className="min-w-[320px] max-w-[360px] flex-[0_0_auto] snap-start"
                >
                  <UniversityEventCard event={ev} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Buckets */}
        <section className="mt-2 space-y-6">
          <Bucket title="Today" items={today} view={view} />
          <Bucket title="This week" items={thisWeek} view={view} />
          <Bucket title="Later" items={later} view={view} />
          {totalFiltered === 0 && (
            <EmptyState
              title={
                loading ? "Loading…" : "No events match your filters"
              }
            />
          )}
        </section>
      </div>
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
        <Button variant="outline" className="h-7 px-2 text-[11px]">
          <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
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
      type="button"
      onClick={onClick}
      className={[
        "rounded-full border px-3 py-1 text-[11px] transition",
        active
          ? "bg-slate-900 text-white border-slate-900"
          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
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
            <UniversityEventCard event={ev as any} />
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
