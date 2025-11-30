// src/app/dashboard/talent/page.tsx
"use client";

/**
 * TalentPage — Old neutral styling + new filters
 * ----------------------------------------------
 * - Keeps original gray/neutral look & layout
 * - Adds Degree (program), College, Skills (comma-sep) filters (URL-synced)
 * - Only color change: "View Profile" button uses old green #6a994e
 * - List/Grid switch, keyboard shortcuts (/, G, R, ⌘K)
 */

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { useEmployerAuth } from "@/hooks/use-employer-auth";
import { authClient } from "@/lib/auth-client";
import { useCommandPalette } from "@/hooks/use-command-palette";

import CompanySidebar from "@/components/company/CompanySidebar";
import CommandPalette from "@/components/CommandPalette";
import SettingsModal from "@/components/SettingsModal";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
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
  Users,
  Search as SearchIcon,
  ChevronDown,
  ArrowUpDown,
  Filter,
  Loader2,
  BadgeCheck,
  MapPin,
  Briefcase,
  MoreVertical,
  Eye,
} from "lucide-react";

/** API item */
type TalentItem = {
  id: number;
  userId: number;
  name: string | null;
  email: string | null;
  program: string | null;
  headline: string | null;
  locationCity: string | null;
  locationCountry: string | null;
  skills: string[];
  experienceYears: number | null;
  verified: boolean;
  isPublic: boolean;
};

type SortKey = "recent" | "experience" | "name";
type SortDir = "desc" | "asc";

/** Stable HSL from string for avatar color */
function hslFromString(s: string) {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 65% 45%)`;
}

function TalentPageInner() {
  // ----- Session & routing -----
  const { session, isPending } = useEmployerAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    isOpen: isCommandPaletteOpen,
    open: openCommandPalette,
    close: closeCommandPalette,
  } = useCommandPalette();

  // ----- Org -----
  const [org, setOrg] =
    useState<{ id: number; name: string; logoUrl?: string | null } | null>(null);

  // ----- Data state -----
  const [items, setItems] = useState<TalentItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [previousPeriodData, setPreviousPeriodData] = useState<{
    total: number;
    avgExperience: number;
  } | null>(null);

  // ----- Filters / search (URL-synced) -----
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [city, setCity] = useState(searchParams.get("city") || "");
  const [country, setCountry] = useState(searchParams.get("country") || "");
  const [program, setProgram] = useState(searchParams.get("program") || ""); // Degree
  const [college, setCollege] = useState(searchParams.get("college") || "");
  const [skillsQuery, setSkillsQuery] = useState(searchParams.get("skills") || "");
  const [minExp, setMinExp] = useState(searchParams.get("minExp") || "");
  const page = Number(searchParams.get("page") || "1");
  const pageSize = 12;

  // ----- Sort & view -----
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // ----- UI -------
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // ---------------- Auth & lifecycle ----------------
  useEffect(() => {
    if (!isPending && !session?.user) router.push("/login");
  }, [session, isPending, router]);

  // Fetch organization display (name/logo)
  useEffect(() => {
    const fetchOrg = async () => {
      try {
        const token = localStorage.getItem("bearer_token");
        const resp = await fetch("/api/organizations?mine=true", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (resp.ok) {
          const orgs = await resp.json();
          if (Array.isArray(orgs) && orgs.length > 0) setOrg(orgs[0]);
        }
      } catch {
        /* soft-fail */
      }
    };
    if (session?.user && !org) fetchOrg();
  }, [session, org]);

  // Keyboard shortcuts (⌘/Ctrl K; / focus; R refresh)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const key = e.key.toLowerCase();
      if ((isMac && e.metaKey && key === "k") || (!isMac && e.ctrlKey && key === "k")) {
        e.preventDefault();
        openCommandPalette();
        return;
      }
      if (key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (key === "r" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        fetchTalent();
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCommandPalette]);

  // Close actions menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (dropdownOpen && !target.closest(".dropdown-container")) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  // Helper to push filters into URL
  const pushQuery = (p = page) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (city) params.set("city", city);
    if (country) params.set("country", country);
    if (program) params.set("program", program);
    if (college) params.set("college", college);
    if (skillsQuery) params.set("skills", skillsQuery);
    if (minExp) params.set("minExp", minExp);
    params.set("page", String(p));
    params.set("pageSize", String(pageSize));
    router.push(`/dashboard/talent?${params.toString()}`);
  };

  const fetchTalent = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (city) params.set("city", city);
      if (country) params.set("country", country);
      if (program) params.set("program", program);
      if (college) params.set("college", college);
      if (skillsQuery) params.set("skills", skillsQuery);
      if (minExp) params.set("minExp", minExp);
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/talent?${params.toString()}`);
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "Failed to load");
      setItems(j.items || []);
      setTotal(j.total || 0);
      if (j.previousPeriod) {
        setPreviousPeriodData(j.previousPeriod);
      }
      setLastRefreshedAt(new Date());
    } catch (e: any) {
      toast.error(e.message || "Failed to load talent");
    } finally {
      setLoading(false);
    }
  };

  // Load data whenever URL params change
  useEffect(() => {
    if (session?.user) fetchTalent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, session?.user]);

  // Helper to calculate percentage change
  const calculateChange = (current: number, previous: number): { value: string; type: "positive" | "negative" | "neutral" } => {
    if (previous === 0) {
      return current > 0 ? { value: "+100%", type: "positive" } : { value: "0%", type: "neutral" };
    }
    const change = ((current - previous) / previous) * 100;
    const rounded = Math.abs(change) < 0.01 ? 0 : change;
    return {
      value: `${rounded >= 0 ? "+" : ""}${rounded.toFixed(2)}%`,
      type: rounded > 0 ? "positive" : rounded < 0 ? "negative" : "neutral",
    };
  };

  // ---------------- Derived KPIs ----------------
  const kpis = useMemo(() => {
    const totalTalent = total;
    const verifiedCount = items.filter((i) => i.verified).length;
    const avgExp =
      items.length > 0
        ? (items.reduce((s, i) => s + (Number(i.experienceYears) || 0), 0) / items.length)
        : 0;
    const avgExpFormatted = avgExp > 0 ? avgExp.toFixed(1) : "0.0";
    const distinctCities = new Set(
      items
        .map((i) =>
          [i.locationCity, i.locationCountry].filter(Boolean).join(", "),
        )
        .filter(Boolean),
    ).size;

    // Calculate changes using real previous period data from API
    const previousTotal = previousPeriodData?.total ?? 0;
    const previousAvgExp = previousPeriodData?.avgExperience ?? 0;

    return {
      totalTalent,
      verifiedCount,
      avgExp: avgExpFormatted,
      distinctCities,
      totalTalentChange: calculateChange(totalTalent, previousTotal),
      avgExpChange: calculateChange(avgExp, previousAvgExp),
    };
  }, [items, total, previousPeriodData]);

  // Sorting (client-side cosmetic)
  const sorted = useMemo(() => {
    const clone = [...items];
    clone.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "experience") {
        const ax = a.experienceYears ?? -Infinity;
        const bx = b.experienceYears ?? -Infinity;
        cmp = ax === bx ? 0 : ax < bx ? -1 : 1;
      } else if (sortKey === "name") {
        const an = (a.name || "").toLowerCase();
        const bn = (b.name || "").toLowerCase();
        cmp = an.localeCompare(bn);
      } else {
        cmp = 0; // "recent" — keep API order
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return clone;
  }, [items, sortKey, sortDir]);

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  // ----- Loading & empty-session states -----
  if (isPending || (loading && !lastRefreshedAt)) {
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
        onSignOut={async () => {
          const { error } = await authClient.signOut();
          if (error?.code) toast.error(error.code);
          else {
            localStorage.removeItem("bearer_token");
            router.push("/");
          }
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        active="talent"
      />

      {/* Main */}
      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto overflow-x-hidden">
        {/* Breadcrumb */}
        <div className="p-8 pb-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <nav className="flex items-center gap-2 text-sm">
                <Link
                  href="/dashboard"
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Dashboard
                </Link>
                <span className="text-gray-400">›</span>
                <span className="text-gray-900 font-medium">Talent</span>
              </nav>
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-4 gap-px rounded-xl bg-border mb-4">
              {[
                {
                  label: "Visible Profiles",
                  value: kpis.totalTalent,
                  change: kpis.totalTalentChange,
                },
                {
                  label: "Verified",
                  value: kpis.verifiedCount,
                },
                {
                  label: "Avg Experience",
                  value: `${kpis.avgExp} yrs`,
                  change: kpis.avgExpChange,
                },
                {
                  label: "Cities",
                  value: kpis.distinctCities,
                },
              ].map((stat, index) => (
                <Card
                  key={stat.label}
                  className={cn(
                    "rounded-none border-0 shadow-none py-0",
                    index === 0 && "rounded-l-xl",
                    index === 3 && "rounded-r-xl"
                  )}
                >
                  <CardContent className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 p-3 sm:p-4">
                    <div className="text-xs font-medium text-muted-foreground">
                      {stat.label}
                    </div>
                    {stat.change && (
                      <div
                        className={cn(
                          "text-xs font-medium",
                          stat.change.type === "positive"
                            ? "text-green-800 dark:text-green-400"
                            : stat.change.type === "negative"
                            ? "text-red-800 dark:text-red-400"
                            : "text-muted-foreground"
                        )}
                      >
                        {stat.change.value}
                      </div>
                    )}
                    <div className="w-full flex-none text-2xl font-medium tracking-tight text-foreground">
                      {stat.value}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Toolbar (compact, neutral) */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-6 sm:px-8 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Search primary */}
                  <div className="relative w-full sm:flex-1 sm:min-w-[260px] sm:max-w-[420px]">
                    <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      ref={searchRef}
                      placeholder="Search by name, skills, headline…"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && pushQuery(1)}
                      className="pl-9"
                    />
                  </div>

                  {/* Actions dropdown with sort */}
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
                              setSortKey("recent");
                              setDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors mb-1 ${
                              sortKey === "recent"
                                ? "bg-gray-100 text-gray-900 font-medium"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            <ArrowUpDown className="w-3 h-3 inline mr-2" />
                            Recent
                          </button>
                          <button
                            onClick={() => {
                              setSortKey("experience");
                              setDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors mb-1 ${
                              sortKey === "experience"
                                ? "bg-gray-100 text-gray-900 font-medium"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            <ArrowUpDown className="w-3 h-3 inline mr-2" />
                            Experience
                          </button>
                          <button
                            onClick={() => {
                              setSortKey("name");
                              setDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors mb-2 ${
                              sortKey === "name"
                                ? "bg-gray-100 text-gray-900 font-medium"
                                : "text-gray-700 hover:bg-gray-100"
                            }`}
                          >
                            <ArrowUpDown className="w-3 h-3 inline mr-2" />
                            Name
                          </button>
                          <button
                            onClick={() => {
                              setSortDir((d) => (d === "desc" ? "asc" : "desc"));
                              setDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors mb-2"
                          >
                            Direction: {sortDir.toUpperCase()}
                          </button>

                          <div className="border-t border-gray-200 my-2"></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Filters toggle */}
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setShowFilters((s) => !s)}
                    aria-expanded={showFilters}
                  >
                    <Filter className="h-4 w-4" />
                    Filters
                  </Button>
                </div>

                {/* Collapsible small filters (neutral look) */}
                {showFilters && (
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-2">
                    <div>
                      <Label className="mb-1 block text-xs text-gray-500">Degree</Label>
                      <Input
                        value={program}
                        onChange={(e) => setProgram(e.target.value)}
                        placeholder="BS CS, BBA…"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs text-gray-500">City</Label>
                      <Input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Lahore"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs text-gray-500">Country</Label>
                      <Input
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        placeholder="Pakistan"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs text-gray-500">College</Label>
                      <Input
                        value={college}
                        onChange={(e) => setCollege(e.target.value)}
                        placeholder="FAST, LUMS…"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs text-gray-500">Min. Exp (yrs)</Label>
                      <Input
                        value={minExp}
                        onChange={(e) => setMinExp(e.target.value.replace(/[^\d]/g, ""))}
                        inputMode="numeric"
                        placeholder="1"
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="mb-1 block text-xs text-gray-500">
                        Skills (comma-sep)
                      </Label>
                      <Input
                        value={skillsQuery}
                        onChange={(e) => setSkillsQuery(e.target.value)}
                        placeholder="React, SQL, Python"
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="col-span-2 md:col-span-5 flex items-center gap-2">
                      <Button size="sm" onClick={() => pushQuery(1)}>
                        Apply
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setQ("");
                          setCity("");
                          setCountry("");
                          setProgram("");
                          setCollege("");
                          setSkillsQuery("");
                          setMinExp("");
                          router.push("/dashboard/talent?page=1&pageSize=12");
                        }}
                      >
                        Reset
                      </Button>
                      <span className="text-xs text-gray-500 ml-auto">
                        {lastRefreshedAt
                          ? `Last refreshed: ${lastRefreshedAt.toLocaleTimeString()}`
                          : ""}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="max-w-6xl mx-auto py-0">
          {loading ? (
            <div className="text-sm text-muted-foreground flex items-center gap-2 py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading talent…
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-center mb-6">
                <div className="w-16 h-16 border-2 border-gray-300 rounded-lg flex items-center justify-center">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No profiles match your filters
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Try broadening your search or resetting filters.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setQ("");
                  setCity("");
                  setCountry("");
                  setProgram("");
                  setCollege("");
                  setSkillsQuery("");
                  setMinExp("");
                  router.push("/dashboard/talent?page=1&pageSize=12");
                }}
              >
                Reset filters
              </Button>
            </div>
          ) : (
            // ======= TABLE VIEW =======
            <div className="rounded-lg border bg-card overflow-x-auto w-full">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="h-10 px-2 font-medium w-[180px]">Name</TableHead>
                    <TableHead className="h-10 px-2 font-medium w-[140px]">Program</TableHead>
                    <TableHead className="h-10 px-2 font-medium w-[80px]">Exp</TableHead>
                    <TableHead className="h-10 px-2 font-medium w-[120px]">Location</TableHead>
                    <TableHead className="h-10 px-2 font-medium w-[140px]">Skills</TableHead>
                    <TableHead className="h-10 px-2 font-medium w-[70px]">Status</TableHead>
                    <TableHead className="h-10 px-2 font-medium w-[60px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((it) => {
                    const displayName = it.name || "Unnamed Candidate";
                    const loc = it.locationCity || it.locationCountry || "—";
                    const programText = it.program || "—";

                    return (
                      <TableRow
                        key={it.id}
                        className="hover:bg-muted/50"
                      >
                        <TableCell className="h-12 px-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-semibold shrink-0" style={{ background: hslFromString(displayName) }}>
                              {(displayName?.trim()?.[0] || "U").toUpperCase()}
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Link
                                    href={`/dashboard/talent/${it.id}`}
                                    className="text-sm font-medium truncate block min-w-0 text-gray-900 hover:text-gray-700 transition-colors"
                                  >
                                    {displayName}
                                  </Link>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                  <p className="font-medium text-white">{displayName}</p>
                                  <p className="text-xs text-gray-200 mt-0.5">{it.email}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                        <TableCell className="h-12 px-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="text-xs text-muted-foreground truncate">
                                  {programText}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                <span className="text-white">{programText}</span>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="h-12 px-2 text-xs text-muted-foreground">
                          {it.experienceYears != null ? `${it.experienceYears}y` : "—"}
                        </TableCell>
                        <TableCell className="h-12 px-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="text-xs text-muted-foreground truncate">
                                  {loc}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                <span className="text-white">{[it.locationCity, it.locationCountry].filter(Boolean).join(", ") || "—"}</span>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className="h-12 px-2">
                          {(it.skills || []).length > 0 ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="flex gap-0.5 flex-wrap">
                                    {it.skills.slice(0, 2).map((s) => (
                                      <span
                                        key={s}
                                        className="text-[9px] px-1.5 py-0.5 rounded border bg-gray-50 truncate max-w-[60px]"
                                        title={s}
                                      >
                                        {s}
                                      </span>
                                    ))}
                                    {it.skills.length > 2 && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded border bg-gray-50">
                                        +{it.skills.length - 2}
                                      </span>
                                    )}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                  <div className="flex flex-wrap gap-1 max-w-xs">
                                    {it.skills.map((s) => (
                                      <span
                                        key={s}
                                        className="text-[10px] px-2 py-1 rounded-full border border-gray-600 bg-gray-800 text-gray-100"
                                      >
                                        {s}
                                      </span>
                                    ))}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="h-12 px-2">
                          {it.verified ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <BadgeCheck className="w-2.5 h-2.5" />
                                    ✓
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>Verified</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="h-12 px-2">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 hover:bg-gray-100"
                                  asChild
                                >
                                  <Link href={`/dashboard/talent/${it.id}`}>
                                    <Eye className="size-3.5" />
                                  </Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="bg-gray-900 text-white border-gray-800">
                                <span className="text-white">View Profile</span>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 py-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => {
                  const p = Math.max(1, page - 1);
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("page", String(p));
                  router.push(`/dashboard/talent?${params.toString()}`);
                }}
              >
                Prev
              </Button>
              <div className="text-sm">
                Page {page} / {pages}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pages}
                onClick={() => {
                  const p = Math.min(pages, page + 1);
                  const params = new URLSearchParams(searchParams.toString());
                  params.set("page", String(p));
                  router.push(`/dashboard/talent?${params.toString()}`);
                }}
              >
                Next
              </Button>
            </div>
          )}
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

// ✅ Suspense-wrapped default export so useSearchParams is safe in Next 15
export default function TalentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TalentPageInner />
    </Suspense>
  );
}
