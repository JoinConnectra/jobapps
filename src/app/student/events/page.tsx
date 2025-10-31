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
import { events as ALL_EVENTS } from './_data/events';
import { EventItem } from './_types';

/** --- Small helpers --- */
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

  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setQ('');
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as any)?.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /** Featured up top (kept separate for the strip) */
  const featured = useMemo(
    () =>
      ALL_EVENTS
        .filter(e => e.featured)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
        .slice(0, 8),
    []
  );

  /** Main filtered list */
  const filtered: EventItem[] = useMemo(() => {
    const text = q.trim().toLowerCase();

    let list = ALL_EVENTS
      .filter(ev => {
        if (tab === 'saved' && !ev.isSaved) return false;
        if (tab === 'registered' && !ev.isRegistered) return false;
        if (tab === 'checkins' && ev.checkIns === 0) return false;
        return true;
      })
      .filter(ev => {
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

        if (filters.employer && ev.employer.toLowerCase() !== filters.employer.toLowerCase()) return false;

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

    // Sort
    if (sort === 'soonest') {
      list = list.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    } else if (sort === 'mostPopular') {
      list = list.sort((a, b) => (b.attendeesCount ?? 0) - (a.attendeesCount ?? 0));
    } else if (sort === 'featured') {
      list = list.sort((a, b) => Number(b.featured) - Number(a.featured));
    }

    return list;
  }, [q, filters, tab, sort]);

  /** Counts */
  const counts = useMemo(() => {
    const saved = ALL_EVENTS.filter(e => e.isSaved).length;
    const reg = ALL_EVENTS.filter(e => e.isRegistered).length;
    const checkins = ALL_EVENTS.filter(e => e.checkIns > 0).length;
    return { saved, reg, checkins, all: ALL_EVENTS.length };
  }, []);

  /** Active filter chips (for quick clearing) */
  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (q.trim()) chips.push({ key: 'q', label: `Search: "${q.trim()}"`, onClear: () => setQ('') });
    if (filters.category !== 'ALL')
      chips.push({ key: 'cat', label: `Category: ${filters.category}`, onClear: () => setFilters({ ...filters, category: 'ALL' }) });
    if (filters.medium !== 'ANY')
      chips.push({ key: 'med', label: `Medium: ${filters.medium.replace('_', ' ')}`, onClear: () => setFilters({ ...filters, medium: 'ANY' }) });
    if (filters.host !== 'ANY')
      chips.push({
        key: 'host',
        label: filters.host === 'EMPLOYER' ? 'Employer hosted' : 'Career center',
        onClear: () => setFilters({ ...filters, host: 'ANY' }),
      });
    if (filters.dateRange !== 'ANY')
      chips.push({
        key: 'date',
        label: `Date: ${filters.dateRange.replace('_', ' ')}`,
        onClear: () => setFilters({ ...filters, dateRange: 'ANY' }),
      });
    if (filters.featuredOnly)
      chips.push({ key: 'feat', label: 'Featured only', onClear: () => setFilters({ ...filters, featuredOnly: false }) });
    if (filters.employer)
      chips.push({ key: 'emp', label: `Employer: ${filters.employer}`, onClear: () => setFilters({ ...filters, employer: '' }) });
    return chips;
  }, [q, filters]);

  /** Date buckets for readability */
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
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Events</h1>
          <p className="text-sm text-muted-foreground">
            Discover career fairs, employer info sessions, and guidance events. Press{' '}
            <kbd className="rounded border px-1 text-xs">/</kbd> to search.
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

      {/* Sticky toolbar */}
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
                  className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
                  onClick={() => setQ('')}
                  aria-label="Clear search"
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
                  {sort === 'soonest' ? 'Soonest first' : sort === 'mostPopular' ? 'Most popular' : 'Featured first'}
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

            {/* View toggle */}
            <div className="ml-1 flex rounded-md border">
              <Button
                type="button"
                variant={view === 'grid' ? 'default' : 'ghost'}
                className="rounded-none"
                onClick={() => setView('grid')}
                aria-label="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant={view === 'list' ? 'default' : 'ghost'}
                className="rounded-none"
                onClick={() => setView('list')}
                aria-label="List view"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Status tabs with counts */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full md:w-auto">
            <TabsList className="grid w-full grid-cols-4 md:w-auto md:grid-cols-4">
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
              onClick={() =>
                setFilters({ ...filters, category: filters.category === 'FAIR' ? 'ALL' : 'FAIR' })
              }
              label="Career fairs"
            />
            <QuickChip
              active={filters.host === 'CAREER_CENTER'}
              onClick={() =>
                setFilters({
                  ...filters,
                  host: filters.host === 'CAREER_CENTER' ? 'ANY' : 'CAREER_CENTER',
                })
              }
              label="Career center"
            />
            <QuickChip
              active={filters.host === 'EMPLOYER'}
              onClick={() =>
                setFilters({
                  ...filters,
                  host: filters.host === 'EMPLOYER' ? 'ANY' : 'EMPLOYER',
                })
              }
              label="Employer hosted"
            />
            <QuickChip
              active={filters.medium === 'VIRTUAL'}
              onClick={() =>
                setFilters({
                  ...filters,
                  medium: filters.medium === 'VIRTUAL' ? 'ANY' : 'VIRTUAL',
                })
              }
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
              <Filters value={filters} onChange={setFilters} />
            </CardContent>
          </>
        )}
      </Card>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeChips.map(c => (
            <Badge key={c.key} variant="secondary" className="flex items-center gap-1">
              {c.label}
              <button onClick={c.onClear} className="ml-1 hover:opacity-80" aria-label="Clear">
                <X className="h-3.5 w-3.5" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ('');
              setFilters(defaultFilters);
            }}
          >
            Clear all
          </Button>
        </div>
      )}

      {/* Featured strip */}
      {featured.length > 0 && tab === 'all' && !filters.featuredOnly && (
        <section>
          <div className="mb-2 flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Featured this month</h2>
          </div>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1 snap-x">
            {featured.map(ev => (
              <div key={ev.id} className="min-w-[320px] max-w-[360px] flex-[0_0_auto] snap-start">
                {/* Ensure full height card in strip too */}
                <EventCard event={ev} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Results, bucketed by when */}
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

/** --- UI Bits --- */

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
            ? // equal-height cards in grid
              'grid grid-cols-1 gap-4 md:grid-cols-2 auto-rows-[1fr] items-stretch'
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

function EmptyState({ title = 'No events match your filters' }: { title?: string }) {
  return (
    <div className="rounded-lg border bg-card text-card-foreground p-10 text-center">
      <p className="text-base font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Try adjusting search, sort, or quick filters.
      </p>
    </div>
  );
}
