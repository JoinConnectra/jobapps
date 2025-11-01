'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Filter,
  Search,
  Plus,
  CalendarDays,
  LayoutGrid,
  List,
  ArrowUpDown,
  X,
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Badge } from '@/components/ui/badge';
import { EventCard } from './_components/EventCard';
import { Filters, FiltersState, defaultFilters } from './_components/Filters';
import type { EventItem, EventCategory, EventMedium } from './_types';

// ✅ Fetch from API
async function fetchEvents(): Promise<EventItem[]> {
  const r = await fetch('/api/events', { cache: 'no-store' });
  if (!r.ok) return [];
  return await r.json();
}

// --- Helpers used in OLD logic ---
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

type ViewMode = 'grid' | 'list';
type SortKey = 'soonest' | 'mostPopular' | 'featured';

export default function StudentEventsPage() {
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);
  const [tab, setTab] = useState<'all' | 'saved' | 'registered' | 'checkins'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const [view, setView] = useState<ViewMode>('grid');
  const [sort, setSort] = useState<SortKey>('soonest');

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  // ✅ Fetch + normalize real DB events
  const load = async () => {
    setLoading(true);
    try {
      const live = await fetchEvents();

      const normalized = (Array.isArray(live) ? live : []).map((e: any) => ({
        id: String(e.id),
        title: e.title ?? '',
        employer: e.employer ?? 'Unknown employer',
        featured: Boolean(e.featured),
        isEmployerHosted: Boolean(e.is_employer_hosted ?? true),
        medium: (e.medium as EventMedium) ?? 'IN_PERSON',
        startDate: e.start_at,
        endDate: e.end_at ?? undefined,
        location: e.location ?? '',
        tags: Array.isArray(e.tags) ? e.tags : [],
        categories: Array.isArray(e.categories) ? e.categories : [],
        attendeesCount: e.reg_count ?? e.attendees_count ?? 0,
        checkIns: e.checkins_count ?? 0,
        isSaved: Boolean(e.isSaved),
        isRegistered: Boolean(e.isRegistered),
      }));

      setEvents(normalized);
    } catch (e) {
      console.error('Failed loading events:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ✅ Counts for old top tabs
  const counts = useMemo(() => {
    const saved = events.filter(e => e.isSaved).length;
    const reg = events.filter(e => e.isRegistered).length;
    const checkins = events.filter(e => e.checkIns > 0).length;
    return { saved, reg, checkins, all: events.length };
  }, [events]);

  // ✅ Featured strip
  const featured = useMemo(() => {
    return events
      .filter(e => e.featured)
      .sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate))
      .slice(0, 8);
  }, [events]);

  // ✅ Filtering (same as old logic)
  const filtered: EventItem[] = useMemo(() => {
    const text = q.trim().toLowerCase();

    let list = events.filter((ev) => {
      if (tab === 'saved' && !ev.isSaved) return false;
      if (tab === 'registered' && !ev.isRegistered) return false;
      if (tab === 'checkins' && ev.checkIns === 0) return false;
      return true;
    });

    list = list.filter((ev) => {
      if (
        text &&
        !(
          ev.title.toLowerCase().includes(text) ||
          ev.employer.toLowerCase().includes(text) ||
          ev.tags.some(t => t.toLowerCase().includes(text))
        )
      ) return false;

      if (filters.category !== 'ALL' && !ev.categories.includes(filters.category)) return false;
      if (filters.medium !== 'ANY' && ev.medium !== filters.medium) return false;

      if (filters.host === 'EMPLOYER' && !ev.isEmployerHosted) return false;
      if (filters.host === 'CAREER_CENTER' && ev.isEmployerHosted) return false;

      if (filters.featuredOnly && !ev.featured) return false;

      if (filters.employer && ev.employer.toLowerCase() !== filters.employer.toLowerCase())
        return false;

      if (filters.dateRange !== 'ANY') {
        const now = new Date();
        const start = new Date(ev.startDate);
        if (filters.dateRange === 'UPCOMING' && start < now) return false;
        if (filters.dateRange === 'THIS_WEEK' && !isWithinDays(start, 7)) return false;
        if (filters.dateRange === 'THIS_MONTH') {
          const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
          if (!(start >= now && start < end)) return false;
        }
      }

      return true;
    });

    // ✅ Sort
    if (sort === 'soonest') {
      list = list.sort((a, b) => +new Date(a.startDate) - +new Date(b.startDate));
    } else if (sort === 'mostPopular') {
      list = list.sort((a, b) => (b.attendeesCount ?? 0) - (a.attendeesCount ?? 0));
    } else if (sort === 'featured') {
      list = list.sort((a, b) => Number(b.featured) - Number(a.featured));
    }

    return list;
  }, [q, filters, tab, sort, events]);

  // ✅ Bucket into Today / Week / Later
  const { today, thisWeek, later } = useMemo(() => {
    const t: EventItem[] = [];
    const w: EventItem[] = [];
    const l: EventItem[] = [];

    filtered.forEach(ev => {
      const d = new Date(ev.startDate);
      if (isToday(d)) t.push(ev);
      else if (isWithinDays(d, 7)) w.push(ev);
      else l.push(ev);
    });

    return { today: t, thisWeek: w, later: l };
  }, [filtered]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 space-y-6">
      {/* ✅ Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
          <p className="text-sm text-muted-foreground">
            Discover career fairs, employer info sessions, and guidance events.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(v => !v)}>
            <Filter className="mr-2 h-4 w-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </Button>
          <Button variant="secondary">
            <Plus className="mr-2 h-4 w-4" />
            Suggest an Event
          </Button>
        </div>
      </div>

      {/* ✅ Sticky top toolbar */}
      <Card className="sticky top-2 z-10 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Browse</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Search */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                ref={searchRef}
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search by title, employer, or tag…"
                className="w-[340px] pl-8"
              />
              {q && (
                <button
                  onClick={() => setQ('')}
                  className="absolute right-2 top-2.5 hover:text-foreground text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  {sort === 'soonest'
                    ? 'Soonest first'
                    : sort === 'mostPopular'
                    ? 'Most popular'
                    : 'Featured first'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSort('soonest')}>Soonest first</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSort('mostPopular')}>Most popular</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSort('featured')}>Featured first</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View buttons */}
            <div className="ml-1 flex rounded-md border">
              <Button
                variant={view === 'grid' ? 'default' : 'ghost'}
                onClick={() => setView('grid')}
                className="rounded-none"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={view === 'list' ? 'default' : 'ghost'}
                onClick={() => setView('list')}
                className="rounded-none"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tabs with counts */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid grid-cols-4 md:grid-cols-4">
              <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
              <TabsTrigger value="saved">Saved ({counts.saved})</TabsTrigger>
              <TabsTrigger value="registered">Registered ({counts.reg})</TabsTrigger>
              <TabsTrigger value="checkins">Check-ins ({counts.checkins})</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>

        {/* Quick chips */}
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-2">
            <QuickChip
              active={filters.category === 'FAIR'}
              onClick={() => setFilters({ ...filters, category: filters.category === 'FAIR' ? 'ALL' : 'FAIR' })}
              label="Career fairs"
            />
            <QuickChip
              active={filters.host === 'CAREER_CENTER'}
              onClick={() => setFilters({
                ...filters,
                host: filters.host === 'CAREER_CENTER' ? 'ANY' : 'CAREER_CENTER',
              })}
              label="Career center"
            />
            <QuickChip
              active={filters.host === 'EMPLOYER'}
              onClick={() => setFilters({
                ...filters,
                host: filters.host === 'EMPLOYER' ? 'ANY' : 'EMPLOYER',
              })}
              label="Employer hosted"
            />
            <QuickChip
              active={filters.medium === 'VIRTUAL'}
              onClick={() => setFilters({
                ...filters,
                medium: filters.medium === 'VIRTUAL' ? 'ANY' : 'VIRTUAL',
              })}
              label="Virtual"
            />
            <QuickChip
              active={filters.dateRange === 'THIS_WEEK'}
              onClick={() =>
                setFilters({
                  ...filters,
                  dateRange: filters.dateRange === 'THIS_WEEK' ? 'ANY' : 'THIS_WEEK',
                })
              }
              label="This week"
            />
            <QuickChip
              active={filters.featuredOnly}
              onClick={() => setFilters({ ...filters, featuredOnly: !filters.featuredOnly })}
              label="Featured"
            />
          </div>
        </CardContent>

        {showFilters && (
          <>
            <Separator />
            <CardContent>
              <Filters value={filters} onChange={setFilters} allEvents={events} />
            </CardContent>
          </>
        )}
      </Card>

      {/* ✅ Featured strip */}
      {featured.length > 0 && tab === 'all' && !filters.featuredOnly && (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Featured this month</h2>
          </div>
          <div className="no-scrollbar flex overflow-x-auto gap-3 pb-1 snap-x">
            {featured.map(ev => (
              <div key={ev.id} className="min-w-[320px] max-w-[360px] flex-[0_0_auto] snap-start">
                <EventCard event={ev} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ✅ Bucketed results */}
      <Tabs value={tab} className="mt-2">
        <TabsContent value="all" className="space-y-6">
          <ResultBuckets view={view} today={today} thisWeek={thisWeek} later={later} />
        </TabsContent>

        <TabsContent value="saved" className="space-y-6">
          <ResultBuckets
            view={view}
            today={today}
            thisWeek={thisWeek}
            later={later}
            emptyTitle="No saved events"
          />
        </TabsContent>

        <TabsContent value="registered" className="space-y-6">
          <ResultBuckets
            view={view}
            today={today}
            thisWeek={thisWeek}
            later={later}
            emptyTitle="No registrations yet"
          />
        </TabsContent>

        <TabsContent value="checkins" className="space-y-6">
          <ResultBuckets
            view={view}
            today={today}
            thisWeek={thisWeek}
            later={later}
            emptyTitle="No past check-ins"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/** --- UI helpers from old code --- */
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
        'rounded-full border px-3 py-1 text-xs transition',
        active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

function ResultBuckets({
  view,
  today,
  thisWeek,
  later,
  emptyTitle = 'No events match your filters',
}: {
  view: ViewMode;
  today: EventItem[];
  thisWeek: EventItem[];
  later: EventItem[];
  emptyTitle?: string;
}) {
  const hasAny = today.length + thisWeek.length + later.length > 0;
  if (!hasAny) return <EmptyState title={emptyTitle} />;
  return (
    <>
      <Bucket title="Today" items={today} view={view} />
      <Bucket title="This week" items={thisWeek} view={view} />
      <Bucket title="Later" items={later} view={view} />
    </>
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
      <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{title}</h3>
      <div
        className={
          view === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-[1fr] items-stretch'
            : 'grid grid-cols-1 gap-3'
        }
      >
        {items.map(ev => (
          <div key={ev.id} className={view === 'list' ? '' : 'h-full'}>
            <EventCard event={ev} />
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
