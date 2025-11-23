'use client';

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { useEmployerAuth } from "@/hooks/use-employer-auth";
import { authClient } from "@/lib/auth-client";
import { useCommandPalette } from "@/hooks/use-command-palette";

import CompanySidebar from "@/components/company/CompanySidebar";
import CommandPalette from "@/components/CommandPalette";
import SettingsModal from "@/components/SettingsModal";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  LayoutGrid,
  List as ListIcon,
  ArrowUpDown,
  Upload,
  Archive,
  Trash2,
  Globe2,
  CalendarDays,
  MapPin,
  Users,
} from "lucide-react";

import { CompanyEventCard } from "./_components/CompanyEventCard";
import type {
  CompanyEvent,
  EventOut,
  EventStatus,
  Medium,
} from "./_types";

type ViewMode = "grid" | "list";
type SortKey = "startSoon" | "createdNew" | "mostInterest";

type MediumFilter = "all" | Medium;
type TimeFilter = "all" | "thisWeek";

export default function EmployerEventsPage() {
  const { session, isPending } = useEmployerAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    isOpen: isCommandPaletteOpen,
    open: openCommandPalette,
    close: closeCommandPalette,
  } = useCommandPalette();

  const [org, setOrg] =
    useState<{ id: number; name: string; logoUrl?: string | null } | null>(
      null
    );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!isPending && !session?.user) router.push("/login");
  }, [session, isPending, router]);

  // Load employer org (name/logo) for sidebar/header
  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const token = localStorage.getItem("bearer_token") || "";
        const r = await fetch("/api/organizations?mine=true", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (r.ok) {
          const orgs = await r.json();
          if (Array.isArray(orgs) && orgs.length > 0) {
            setOrg(orgs[0]);
          }
        }
      } catch {
        /* soft fail */
      }
    };
    if (session?.user && !org) fetchOrg();
  }, [session?.user, org]);

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) toast.error(error.code);
    else {
      localStorage.removeItem("bearer_token");
      router.push("/");
    }
  };

  // page state
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<EventStatus | "all">("all");
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<SortKey>("startSoon");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filters
  const [mediumFilter, setMediumFilter] = useState<MediumFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [requireRegistrations, setRequireRegistrations] = useState(false);

  const [raw, setRaw] = useState<EventOut[]>([]);
  const [loading, setLoading] = useState(false);

  // Initialize filters from URL (q, medium, time, requireReg, tab)
  useEffect(() => {
    const initQ = searchParams.get("q") ?? "";
    const initMedium = (searchParams.get("medium") as MediumFilter | null) ?? "all";
    const initTime = (searchParams.get("time") as TimeFilter | null) ?? "all";
    const initRequire = searchParams.get("hasReg") === "1";
    const initTab = (searchParams.get("tab") as EventStatus | "all" | null) ?? "all";

    setQ(initQ);
    setMediumFilter(initMedium);
    setTimeFilter(initTime);
    setRequireRegistrations(initRequire);
    setTab(initTab);
  }, [searchParams]);

  // Sync filters to URL for better UX (shareable / persistent views)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);

    if (q) url.searchParams.set("q", q);
    else url.searchParams.delete("q");

    if (mediumFilter !== "all") url.searchParams.set("medium", mediumFilter);
    else url.searchParams.delete("medium");

    if (timeFilter !== "all") url.searchParams.set("time", timeFilter);
    else url.searchParams.delete("time");

    if (requireRegistrations) url.searchParams.set("hasReg", "1");
    else url.searchParams.delete("hasReg");

    if (tab !== "all") url.searchParams.set("tab", tab);
    else url.searchParams.delete("tab");

    window.history.replaceState(null, "", url.toString());
  }, [q, mediumFilter, timeFilter, requireRegistrations, tab]);

  async function load() {
    if (!org?.id) return;
    setLoading(true);
    try {
      const url = new URL("/api/events", window.location.origin);
      url.searchParams.set("orgId", String(org.id));
      if (tab !== "all") url.searchParams.set("status", tab);

      const r = await fetch(url.toString(), { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Failed to fetch");

      setRaw(Array.isArray(j) ? j : []);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load events");
    } finally {
      setLoading(false);
    }
  }

  // reload when tab or org changes
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.id, tab]);

  // map data
  const ALL_EVENTS: CompanyEvent[] = useMemo(() => {
    return raw.map((e) => ({
      id: String(e.id),
      title: e.title,
      medium: (e.medium as Medium) ?? "IN_PERSON",
      location: e.location ?? "",
      startDate: e.start_at,
      endDate: e.end_at ?? undefined,
      status: (e.status as EventStatus) ?? "draft",
      createdAt: e.created_at ? new Date(e.created_at).getTime() : undefined,
      interestCount: e.reg_count ?? e.attendees_count ?? 0,
      tags: Array.isArray(e.tags) ? e.tags : [],
      description: e.description ?? undefined,
      featured: e.featured ?? false,
      regCount: e.reg_count,
      checkinsCount: e.checkins_count,
      capacity:
        typeof e.capacity === "number"
          ? e.capacity
          : e.capacity == null
          ? null
          : Number(e.capacity) || null,
      registrationUrl: e.registration_url ?? null,
    }));
  }, [raw]);

  const filtered: CompanyEvent[] = useMemo(() => {
    const text = q.trim().toLowerCase();
    let list = ALL_EVENTS.filter((e) => {
      if (!text) return true;
      return (
        e.title.toLowerCase().includes(text) ||
        (e.location ?? "").toLowerCase().includes(text) ||
        e.tags.some((t) => t.toLowerCase().includes(text))
      );
    });

    // apply medium filter
    if (mediumFilter !== "all") {
      list = list.filter((e) => e.medium === mediumFilter);
    }

    // apply time filter
    if (timeFilter === "thisWeek") {
      const now = Date.now();
      const oneWeekFromNow = now + 7 * 24 * 60 * 60 * 1000;
      list = list.filter((e) => {
        const t = new Date(e.startDate).getTime();
        return t >= now && t <= oneWeekFromNow;
      });
    }

    // require at least one registration
    if (requireRegistrations) {
      list = list.filter(
        (e) =>
          (typeof e.regCount === "number" && e.regCount > 0) ||
          (typeof e.interestCount === "number" && e.interestCount > 0)
      );
    }

    if (sort === "startSoon") {
      list = list
        .slice()
        .sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );
    } else if (sort === "createdNew") {
      list = list
        .slice()
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } else if (sort === "mostInterest") {
      list = list
        .slice()
        .sort(
          (a, b) => (b.interestCount || 0) - (a.interestCount || 0)
        );
    }

    return list;
  }, [ALL_EVENTS, q, sort, mediumFilter, timeFilter, requireRegistrations]);

  const counts = useMemo(() => {
    const drafts = raw.filter((e) => e.status === "draft").length;
    const published = raw.filter((e) => e.status === "published").length;
    const past = raw.filter((e) => e.status === "past").length;
    return { drafts, published, past, all: raw.length };
  }, [raw]);

  const toggleSelect = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked
        ? Array.from(new Set([...prev, id]))
        : prev.filter((x) => x !== id)
    );
  };

  const allSelectedOnPage =
    filtered.length > 0 && filtered.every((e) => selectedIds.includes(e.id));
  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? filtered.map((e) => e.id) : []);
  };

  async function bulkUpdateStatus(newStatus: EventStatus) {
    if (selectedIds.length === 0) return;
    try {
      const ids = selectedIds
        .map((id) => Number(id))
        .filter((n) => Number.isFinite(n));

      await Promise.all(
        ids.map((id) =>
          fetch(`/api/events/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus }),
          })
        )
      );

      toast.success(
        newStatus === "published"
          ? "Events published"
          : "Events updated"
      );
      setSelectedIds([]);
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Bulk update failed");
    }
  }

  async function bulkDelete() {
    if (selectedIds.length === 0) return;
    if (!window.confirm("Delete selected events? This cannot be undone.")) {
      return;
    }
    try {
      const ids = selectedIds
        .map((id) => Number(id))
        .filter((n) => Number.isFinite(n));

      await Promise.all(
        ids.map((id) =>
          fetch(`/api/events/${id}`, {
            method: "DELETE",
          })
        )
      );

      toast.success("Events deleted");
      setSelectedIds([]);
      await load();
    } catch (e) {
      console.error(e);
      toast.error("Bulk delete failed");
    }
  }

  const handleCreateClick = () => {
    router.push("/dashboard/events/new");
  };

  if (isPending) {
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
        user={session.user}
        onSignOut={handleSignOut}
        onOpenSettings={() => setIsSettingsOpen(true)}
        active="events"
      />

      {/* Main */}
      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto overflow-x-hidden">
        <div className="p-8">
          <div className="max-w-6xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-4 mb-4">
              <nav className="flex items-center gap-2 text-sm">
                <Link
                  href="/dashboard"
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Dashboard
                </Link>
                <span className="text-gray-400">›</span>
                <span className="text-gray-900 font-medium">Events</span>
              </nav>
            </div>

            {/* Top actions */}
            <div className="mb-3 flex gap-2">
              <Button size="sm" onClick={handleCreateClick}>
                <Plus className="mr-2 h-4 w-4" />
                New Event
              </Button>
              <Button size="sm" variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Bulk import
              </Button>
            </div>

            {/* Toolbar card (browse, search, tabs, filters) */}
            <Card className="sticky top-2 z-10 backdrop-blur supports-[backdrop-filter]:bg-background/80">
              <CardHeader className="py-1">
                <CardTitle className="text-sm font-medium leading-none">
                  Browse
                </CardTitle>
              </CardHeader>

              <CardContent className="py-2">
                {/* First row: left (search/sort/view) — right (tabs) */}
                <div className="flex flex-wrap items-center gap-2 md:gap-3 justify-between">
                  {/* Left cluster */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative">
                      <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Search title, location, tag…"
                        className="h-8 w-[240px] pl-7 text-sm"
                      />
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                        >
                          <ArrowUpDown className="mr-2 h-3.5 w-3.5" />
                          {sort === "startSoon"
                            ? "Start date"
                            : sort === "createdNew"
                            ? "Recently created"
                            : "Most interest"}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setSort("startSoon")}
                        >
                          Start date
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setSort("createdNew")}
                        >
                          Recently created
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setSort("mostInterest")}
                        >
                          Most interest
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="flex rounded-md border">
                      <Button
                        type="button"
                        size="sm"
                        variant={view === "grid" ? "default" : "ghost"}
                        className="rounded-none h-8"
                        onClick={() => setView("grid")}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={view === "list" ? "default" : "ghost"}
                        className="rounded-none h-8"
                        onClick={() => setView("list")}
                      >
                        <ListIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Right cluster (Tabs) */}
                  <div className="shrink-0 w-full md:w-auto">
                    <Tabs
                      value={tab}
                      onValueChange={(v) => {
                        setTab(v as any);
                        setSelectedIds([]);
                      }}
                      className="w-full"
                    >
                      <div className="w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <TabsList className="inline-flex min-w-max gap-1 p-1 h-9">
                          <TabsTrigger
                            value="all"
                            className="h-8 px-2 text-xs whitespace-nowrap inline-flex items-center gap-1.5"
                          >
                            <span>All</span>
                            <span className="px-1 py-0 text-[10px] rounded bg-gray-200 text-gray-700">
                              {counts.all}
                            </span>
                          </TabsTrigger>
                          <TabsTrigger
                            value="draft"
                            className="h-8 px-2 text-xs whitespace-nowrap inline-flex items-center gap-1.5"
                          >
                            <span>Drafts</span>
                            <span className="px-1 py-0 text-[10px] rounded bg-gray-200 text-gray-700">
                              {counts.drafts}
                            </span>
                          </TabsTrigger>
                          <TabsTrigger
                            value="published"
                            className="h-8 px-2 text-xs whitespace-nowrap inline-flex items-center gap-1.5"
                          >
                            <span>Published</span>
                            <span className="px-1 py-0 text-[10px] rounded bg-gray-200 text-gray-700">
                              {counts.published}
                            </span>
                          </TabsTrigger>
                          <TabsTrigger
                            value="past"
                            className="h-8 px-2 text-xs whitespace-nowrap inline-flex items-center gap-1.5"
                          >
                            <span>Past</span>
                            <span className="px-1 py-0 text-[10px] rounded bg-gray-200 text-gray-700">
                              {counts.past}
                            </span>
                          </TabsTrigger>
                        </TabsList>
                      </div>
                    </Tabs>
                  </div>
                </div>

                {/* Second row: Filters / Bulk */}
                <div className="mt-2 flex flex-wrap items-center gap-2 md:gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => setShowFilters((v) => !v)}
                  >
                    <Filter className="mr-2 h-3.5 w-3.5" />
                    {showFilters ? "Hide Filters" : "Show Filters"}
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                      >
                        <MoreHorizontal className="mr-2 h-3.5 w-3.5" />
                        Bulk ({selectedIds.length})
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Selected</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => bulkUpdateStatus("published")}
                      >
                        <Globe2 className="mr-2 h-4 w-4" /> Publish
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => bulkUpdateStatus("draft")}
                      >
                        <Archive className="mr-2 h-4 w-4" /> Move to draft
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={bulkDelete}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>

              {showFilters && (
                <>
                  <Separator />
                  <CardContent className="py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          mediumFilter === "VIRTUAL" ? "default" : "outline"
                        }
                        className="h-6 text-xs px-2 cursor-pointer"
                        onClick={() =>
                          setMediumFilter(
                            mediumFilter === "VIRTUAL" ? "all" : "VIRTUAL"
                          )
                        }
                      >
                        Virtual
                      </Badge>
                      <Badge
                        variant={
                          mediumFilter === "IN_PERSON" ? "default" : "outline"
                        }
                        className="h-6 text-xs px-2 cursor-pointer"
                        onClick={() =>
                          setMediumFilter(
                            mediumFilter === "IN_PERSON" ? "all" : "IN_PERSON"
                          )
                        }
                      >
                        In-person
                      </Badge>
                      <Badge
                        variant={timeFilter === "thisWeek" ? "default" : "outline"}
                        className="h-6 text-xs px-2 cursor-pointer"
                        onClick={() =>
                          setTimeFilter(
                            timeFilter === "thisWeek" ? "all" : "thisWeek"
                          )
                        }
                      >
                        This week
                      </Badge>
                      <Badge
                        variant={
                          requireRegistrations ? "default" : "outline"
                        }
                        className="h-6 text-xs px-2 cursor-pointer"
                        onClick={() =>
                          setRequireRegistrations((v) => !v)
                        }
                      >
                        Has registration
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          setQ("");
                          setMediumFilter("all");
                          setTimeFilter("all");
                          setRequireRegistrations(false);
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </CardContent>
                </>
              )}
            </Card>

            {/* Select all */}
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

            {/* Results */}
            {loading ? (
              <Card className="py-12 text-center text-sm text-muted-foreground mt-2">
                Loading…
              </Card>
            ) : filtered.length === 0 ? (
              <div className="mt-2">
                <Empty onCreate={handleCreateClick} />
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mt-2">
                {filtered.map((ev) => (
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
                  {filtered.map((ev) => {
                    const dateString = formatEventDate(ev.startDate);
                    const temporal = getTemporalLabel(ev);
                    const registered =
                      typeof ev.regCount === "number"
                        ? ev.regCount
                        : typeof ev.interestCount === "number"
                        ? ev.interestCount
                        : 0;
                    const checkedIn =
                      typeof ev.checkinsCount === "number"
                        ? ev.checkinsCount
                        : undefined;
                    const capacity =
                      typeof ev.capacity === "number" && !Number.isNaN(ev.capacity)
                        ? ev.capacity
                        : undefined;

                    const utilization =
                      typeof capacity === "number" && capacity > 0
                        ? Math.min(100, (registered / capacity) * 100)
                        : null;

                    return (
                      <div
                        key={ev.id}
                        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/40"
                        onClick={() => router.push(`/dashboard/events/${ev.id}`)}
                      >
                        <Checkbox
                          checked={selectedIds.includes(ev.id)}
                          onCheckedChange={(v) =>
                            toggleSelect(ev.id, Boolean(v))
                          }
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="relative h-14 w-24 overflow-hidden rounded-md border bg-white">
                          <Image
                            src="/images/skans2.png"
                            alt="cover"
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold">
                              {ev.title}
                            </p>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0.5"
                            >
                              {temporal}
                            </Badge>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {dateString}
                            </span>
                            {ev.location && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {ev.location}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <Globe2 className="h-3.5 w-3.5" />
                              {ev.medium === "VIRTUAL"
                                ? "Virtual"
                                : "In-person"}
                            </span>
                            {(registered > 0 ||
                              typeof checkedIn === "number" ||
                              typeof capacity === "number") && (
                              <span className="inline-flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                {registered} registered
                                {typeof checkedIn === "number" &&
                                  ` · ${checkedIn} checked-in`}
                                {typeof capacity === "number" &&
                                  ` · cap ${capacity}`}
                              </span>
                            )}
                          </div>
                          {utilization !== null && (
                            <div className="mt-2">
                              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                                <span>Utilization</span>
                                <span>
                                  {registered}/{capacity} ({Math.round(utilization)}%)
                                </span>
                              </div>
                              <div className="h-1.5 w-40 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500"
                                  style={{ width: `${utilization}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              ev.status === "published"
                                ? "default"
                                : ev.status === "draft"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {ev.status}
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(
                                `/dashboard/events/${ev.id}/preview`
                              );
                            }}
                          >
                            Preview
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Command palette */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={closeCommandPalette}
          orgId={org?.id}
        />

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
            } catch {
              /* no-op */
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

function Empty({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="py-16 text-center">
      <Image
        src="/images/skans2.png"
        alt="empty"
        width={84}
        height={48}
        className="mx-auto mb-3 rounded object-cover"
      />
      <h3 className="text-base font-semibold">No events yet</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Create your first event to attract candidates. You can publish
        immediately or save as draft.
      </p>
      <div className="mt-4">
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Event
        </Button>
      </div>
    </Card>
  );
}

function formatEventDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

function getTemporalLabel(ev: CompanyEvent): "Upcoming" | "Ongoing" | "Past" {
  const now = Date.now();
  const start = new Date(ev.startDate).getTime();
  const end = ev.endDate ? new Date(ev.endDate).getTime() : start;

  if (end < now) return "Past";
  if (start <= now && end >= now) return "Ongoing";
  return "Upcoming";
}
