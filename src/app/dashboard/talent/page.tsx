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

import { useEffect, useMemo, useRef, useState } from "react";
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

import {
  Users,
  Search as SearchIcon,
  LayoutGrid,
  Rows,
  ChevronDown,
  ArrowUpDown,
  Filter,
  Loader2,
  BadgeCheck,
  MapPin,
  Briefcase,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
type ViewMode = "grid" | "list";

/** Stable HSL from string for avatar color */
function hslFromString(s: string) {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 65% 45%)`;
}

export default function TalentPage() {
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
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // ----- UI -------
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

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

  // Keyboard shortcuts (⌘/Ctrl K; / focus; R refresh; G toggle view)
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
      if (key === "g" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setViewMode((v) => (v === "grid" ? "list" : "grid"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openCommandPalette]);

  // Load data whenever URL params change
  useEffect(() => {
    if (session?.user) fetchTalent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, session?.user]);

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
      setLastRefreshedAt(new Date());
    } catch (e: any) {
      toast.error(e.message || "Failed to load talent");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- Derived KPIs ----------------
  const kpis = useMemo(() => {
    const totalTalent = total;
    const verifiedCount = items.filter((i) => i.verified).length;
    const avgExp =
      items.length > 0
        ? (items.reduce((s, i) => s + (Number(i.experienceYears) || 0), 0) / items.length).toFixed(1)
        : "0.0";
    const distinctCities = new Set(
      items.map((i) => [i.locationCity, i.locationCountry].filter(Boolean).join(", ")).filter(Boolean),
    ).size;

    return { totalTalent, verifiedCount, avgExp, distinctCities };
  }, [items, total]);

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

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  // ----- Loading & empty-session states -----
  if (isPending || (loading && !lastRefreshedAt)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!session?.user) return null;

  // Tile avatar component
  const InitialAvatar = ({ name }: { name: string }) => {
    const initial = (name?.trim()?.[0] || "U").toUpperCase();
    const bg = hslFromString(name || "User");
    return (
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold shrink-0"
        style={{ background: bg }}
        aria-hidden
      >
        {initial}
      </div>
    );
  };

  // Small stat card (neutral)
  const StatTile = ({
    icon: Icon,
    label,
    value,
    sub,
  }: {
    icon: any;
    label: string;
    value: number | string;
    sub?: string;
  }) => (
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
        <div className="p-8">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <StatTile icon={Users} label="Visible Profiles" value={kpis.totalTalent} />
              <StatTile icon={BadgeCheck} label="Verified" value={kpis.verifiedCount} />
              <StatTile icon={Briefcase} label="Avg Experience" value={`${kpis.avgExp} yrs`} />
              <StatTile icon={MapPin} label="Cities" value={kpis.distinctCities} />
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

                  {/* Sort (cosmetic) */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <ArrowUpDown className="h-4 w-4" />
                        Sort
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => setSortKey("recent")}>
                        Recent {sortKey === "recent" ? "•" : ""}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortKey("experience")}>
                        Experience {sortKey === "experience" ? "•" : ""}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setSortKey("name")}>
                        Name {sortKey === "name" ? "•" : ""}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                      >
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
                        viewMode === "list"
                          ? "bg-[#6a994e] text-white shadow-sm"
                          : "text-gray-700 hover:bg-gray-200/60",
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
                        viewMode === "grid"
                          ? "bg-[#6a994e] text-white shadow-sm"
                          : "text-gray-700 hover:bg-gray-200/60",
                      ].join(" ")}
                      title="G to toggle"
                    >
                      <LayoutGrid className="h-4 w-4" />
                      Grid
                    </button>
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
                      <Label className="mb-1 block text-xs text-gray-500">Skills (comma-sep)</Label>
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
                        {lastRefreshedAt ? `Last refreshed: ${lastRefreshedAt.toLocaleTimeString()}` : ""}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-0">
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
          ) : viewMode === "list" ? (
            // ======= LIST VIEW =======
            <ul className="space-y-2 sm:space-y-3">
              {sorted.map((it) => {
                const displayName = it.name || "Unnamed Candidate";
                const loc =
                  [it.locationCity, it.locationCountry].filter(Boolean).join(", ") ||
                  "—";
                return (
                  <li
                    key={it.id}
                    className="rounded-xl border border-gray-200 bg-white px-5 py-4 md:py-5 shadow-sm hover:shadow transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/dashboard/talent/${it.id}`}
                        className="flex-1 min-w-0 flex items-start gap-3"
                      >
                        <InitialAvatar name={displayName} />

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-gray-900 hover:text-[#6a994e] transition-colors truncate">
                              {displayName}
                            </h3>
                            {it.verified && (
                              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <BadgeCheck className="w-3 h-3" />
                                Verified
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                            {it.program ? (
                              <span className="inline-flex items-center gap-1">
                                <Briefcase className="w-3.5 h-3.5" />
                                {it.program}
                              </span>
                            ) : null}
                            {it.experienceYears != null ? (
                              <span>{it.experienceYears} yrs</span>
                            ) : null}
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {loc}
                            </span>
                          </div>

                          {it.headline && (
                            <div className="text-sm text-gray-700 mt-2 line-clamp-2">
                              {it.headline}
                            </div>
                          )}

                          {(it.skills || []).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {it.skills.slice(0, 8).map((s) => (
                                <span
                                  key={s}
                                  className="text-[10px] px-2 py-1 rounded-full border"
                                >
                                  {s}
                                </span>
                              ))}
                              {it.skills.length > 8 && (
                                <span className="text-[10px] px-2 py-1 rounded-full border bg-gray-50">
                                  +{it.skills.length - 8}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </Link>

                      <div className="shrink-0 pt-1">
                        <Link href={`/dashboard/talent/${it.id}`}>
                          <Button size="sm" className="bg-[#6a994e] hover:bg-[#5a8743] text-white">
                            View Profile
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            // ======= GRID VIEW =======
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sorted.map((it) => {
                const displayName = it.name || "Unnamed Candidate";
                const loc =
                  [it.locationCity, it.locationCountry].filter(Boolean).join(", ") ||
                  "—";
                return (
                  <div
                    key={it.id}
                    className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow transition-shadow flex flex-col"
                  >
                    <Link
                      href={`/dashboard/talent/${it.id}`}
                      className="min-w-0 flex items-start gap-3"
                    >
                      <InitialAvatar name={displayName} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-medium text-gray-900 hover:text-[#6a994e] transition-colors truncate">
                            {displayName}
                          </h3>
                          {it.verified && (
                            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <BadgeCheck className="w-3 h-3" />
                              Verified
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1">
                          {(it.program || "—")}
                          {it.experienceYears != null ? ` • ${it.experienceYears} yrs` : ""}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                          {loc}
                        </div>
                        {it.headline && (
                          <div className="text-xs text-gray-700 mt-2 line-clamp-2">
                            {it.headline}
                          </div>
                        )}
                      </div>
                    </Link>

                    {(it.skills || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {it.skills.slice(0, 6).map((s) => (
                          <span
                            key={s}
                            className="text-[10px] px-2 py-1 rounded-full border"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-4">
                      <Link href={`/dashboard/talent/${it.id}`}>
                        <Button size="sm" className="w-full bg-[#6a994e] hover:bg-[#5a8743] text-white">
                          View Profile
                        </Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
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
