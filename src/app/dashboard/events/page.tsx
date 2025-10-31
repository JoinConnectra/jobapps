'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';

import DashboardShell from '@/components/company/DashboardShell';
import { useEmployerAuth } from '@/hooks/use-employer-auth';
import { authClient } from '@/lib/auth-client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';

import {
  Search, Plus, Filter, MoreHorizontal, LayoutGrid, List, ArrowUpDown,
  Upload, Eye, Archive, Trash2, Globe2, CalendarDays, MapPin
} from 'lucide-react';

import { CompanyEventCard } from './_components/CompanyEventCard';
import { EventComposer } from './_components/EventComposer';
import { events as ALL_EVENTS } from './_data/events';
import { CompanyEvent, EventStatus } from './_types';

type ViewMode = 'grid' | 'list';
type SortKey = 'startSoon' | 'createdNew' | 'mostInterest';

export default function EmployerEventsPage() {
  // ---- Auth / Org for shell ----
  const { session, isPending } = useEmployerAuth();
  const [org, setOrg] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    (async () => {
      if (!session?.user) return;
      const token = localStorage.getItem('bearer_token') || '';
      const r = await fetch('/api/organizations?mine=true', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (r.ok) {
        const orgs = await r.json();
        setOrg(orgs?.[0] ? { id: orgs[0].id, name: orgs[0].name } : null);
      }
    })();
  }, [session?.user]);

  const handleSignOut = async () => {
    await authClient.signOut();
    localStorage.removeItem('bearer_token');
  };

  // ---- Page state ----
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<EventStatus | 'all'>('all');
  const [view, setView] = useState<ViewMode>('grid');
  const [sort, setSort] = useState<SortKey>('startSoon');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [composerOpen, setComposerOpen] = useState(false);

  const filtered: CompanyEvent[] = useMemo(() => {
    const text = q.trim().toLowerCase();
    let list = ALL_EVENTS
      .filter(e => (tab === 'all' ? true : e.status === tab))
      .filter(e => {
        if (!text) return true;
        return (
          e.title.toLowerCase().includes(text) ||
          e.location.toLowerCase().includes(text) ||
          e.tags.some(t => t.toLowerCase().includes(text))
        );
      });

    // demo sort
    if (sort === 'startSoon') {
      list = list.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    } else if (sort === 'createdNew') {
      list = list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else if (sort === 'mostInterest') {
      list = list.sort((a, b) => (b.interestCount || 0) - (a.interestCount || 0));
    }

    return list;
  }, [q, tab, sort]);

  const counts = useMemo(() => {
    const drafts = ALL_EVENTS.filter(e => e.status === 'draft').length;
    const published = ALL_EVENTS.filter(e => e.status === 'published').length;
    const past = ALL_EVENTS.filter(e => e.status === 'past').length;
    return { drafts, published, past, all: ALL_EVENTS.length };
  }, []);

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds(prev => checked ? Array.from(new Set([...prev, id])) : prev.filter(x => x !== id));
  };

  const allSelectedOnPage = filtered.length > 0 && filtered.every(e => selectedIds.includes(e.id));
  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? filtered.map(e => e.id) : []);
  };

  if (isPending || !session?.user) return null;

  return (
    <DashboardShell
      org={org}
      user={{ name: session.user.name }}
      onSignOut={handleSignOut}
      crumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Events' }]}
      title="Events"
      actions={
        <div className="flex gap-2">
          <Button onClick={() => setComposerOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Event
          </Button>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Bulk import
          </Button>
        </div>
      }
    >
      {/* ====== Toolbar ====== */}
      <Card className="sticky top-2 z-10 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Browse</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Search + sort + view */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search by title, location, or tag…"
                className="w-[320px] pl-8"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  {sort === 'startSoon' ? 'Start date' : sort === 'createdNew' ? 'Recently created' : 'Most interest'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSort('startSoon')}>Start date</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSort('createdNew')}>Recently created</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSort('mostInterest')}>Most interest</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

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

          {/* Tabs */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full md:w-auto">
            <TabsList className="grid w-full grid-cols-4 md:w-auto md:grid-cols-4">
              <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
              <TabsTrigger value="draft">Drafts ({counts.drafts})</TabsTrigger>
              <TabsTrigger value="published">Published ({counts.published})</TabsTrigger>
              <TabsTrigger value="past">Past ({counts.past})</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filters + Bulk */}
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowFilters(v => !v)}>
              <Filter className="mr-2 h-4 w-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreHorizontal className="mr-2 h-4 w-4" />
                  Bulk actions ({selectedIds.length})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Selected</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {/* hook up to API later */}}>
                  <Globe2 className="mr-2 h-4 w-4" /> Publish
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {/* hook up to API later */}}>
                  <Archive className="mr-2 h-4 w-4" /> Archive
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => {/* hook up to API later */}}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>

        {showFilters && (
          <>
            <Separator />
            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Virtual</Badge>
                <Badge variant="outline">In-person</Badge>
                <Badge variant="outline">This week</Badge>
                <Badge variant="outline">Has registration</Badge>
                <Button variant="ghost" size="sm" onClick={() => setQ('')}>Clear</Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>

      {/* ====== Select all on page ====== */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-3">
          <Checkbox
            checked={allSelectedOnPage}
            onCheckedChange={(v) => toggleSelectAll(Boolean(v))}
            id="selall"
          />
          <label htmlFor="selall">Select all on page</label>
        </div>
      )}

      {/* ====== Results ====== */}
      {filtered.length === 0 ? (
        <Empty />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-2">
          {filtered.map(ev => (
            <CompanyEventCard
              key={ev.id}
              event={ev}
              selected={selectedIds.includes(ev.id)}
              onSelect={(checked) => toggleSelect(ev.id, checked)}
            />
          ))}
        </div>
      ) : (
        <Card className="mt-2">
          <div className="divide-y">
            {filtered.map(ev => (
              <div key={ev.id} className="flex items-center gap-3 p-3">
                <Checkbox
                  checked={selectedIds.includes(ev.id)}
                  onCheckedChange={(v) => toggleSelect(ev.id, Boolean(v))}
                />
                <div className="relative h-14 w-24 overflow-hidden rounded-md border bg-white">
                  <Image src="/images/skans2.png" alt="cover" fill className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{ev.title}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(ev.startDate).toLocaleString()}
                    </span>
                    {ev.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {ev.location}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Globe2 className="h-3.5 w-3.5" />
                      {ev.medium === 'VIRTUAL' ? 'Virtual' : 'In-person'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={ev.status === 'published' ? 'default' : ev.status === 'draft' ? 'secondary' : 'outline'}>
                    {ev.status}
                  </Badge>
                  <Button size="sm" variant="outline">
                    <Eye className="mr-2 h-4 w-4" /> Preview
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ====== Composer dialog ====== */}
      <EventComposer open={composerOpen} onOpenChange={setComposerOpen} />
    </DashboardShell>
  );
}

function Empty() {
  return (
    <Card className="py-16 text-center">
      <Image src="/images/skans2.png" alt="empty" width={84} height={48} className="mx-auto mb-3 rounded object-cover" />
      <h3 className="text-base font-semibold">No events yet</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Create your first event to attract candidates. You can publish immediately or save as draft.
      </p>
      <div className="mt-4">
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Event
        </Button>
      </div>
    </Card>
  );
}
