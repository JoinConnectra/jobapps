// src/app/student/jobs/page.tsx
"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

/* ---------- Types ---------- */
type Job = {
  id: number | string;
  orgId?: number | string;
  organizationName?: string | null;
  organizationLogoUrl?: string | null;
  organizationWebsite?: string | null;
  title: string;
  dept?: string | null;
  locationMode?: "onsite" | "remote" | "hybrid" | string | null;
  salaryRange?: string | null;
  descriptionMd?: string | null;
  postedAt?: string | null;
  tags?: string[];
};

function normalize(s?: string | null) {
  return (s ?? "").toLowerCase();
}

function timeAgo(iso?: string | null) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (d <= 0) return "Today";
  if (d === 1) return "1 day ago";
  if (d < 7) return `${d} days ago`;
  const w = Math.floor(d / 7);
  return w === 1 ? "1 week ago" : `${w} weeks ago`;
}

function daysSince(iso?: string | null) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const diff = Date.now() - then;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/* ---------- Collapsible description (same vibe as JobDetailPage) ---------- */

function CollapsibleText({
  text,
  previewChars = 800,
}: {
  text: string;
  previewChars?: number;
}) {
  const [expanded, setExpanded] = React.useState(false);

  if (!text || !text.trim()) return null;

  // Light normalization: keep employer’s structure but make sure line breaks show nicely
  const cleaned = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const needsToggle = cleaned.length > previewChars;
  const shown =
    expanded || !needsToggle
      ? cleaned
      : cleaned.slice(0, previewChars).trimEnd() + "…";

  return (
    <div className="relative">
      {/* 🔧 darker text */}
      <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
        {shown}
      </pre>

      {/* Fade overlay when truncated */}
      {!expanded && needsToggle && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-muted to-transparent" /> // 🔧 darker fade
      )}

      {needsToggle && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          {expanded ? (
            <>
              See less <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              See more <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}

/* ---------- Inner browser ---------- */

function JobBrowserInner({ jobs }: { jobs: Job[] }) {
  const router = useRouter();
  const sp = useSearchParams();

  const initialSelected =
    sp.get("job") ?? (jobs[0]?.id?.toString() ?? null);

  const [selectedId, setSelectedId] = React.useState<string | null>(
    initialSelected
  );
  const [search, setSearch] = React.useState("");
  const [dept, setDept] = React.useState<string>("all");
  const [location, setLocation] = React.useState<string>("all");
  const [sort, setSort] = React.useState<string>("recent"); // recent | title | org
  const [showSavedOnly, setShowSavedOnly] = React.useState(false);

  const [saved, setSaved] = React.useState<Record<string, boolean>>({});
  const [saving, setSaving] = React.useState<Record<string, boolean>>({}); // per-job spinner/lock

  const [copyingLink, setCopyingLink] = React.useState(false);

  // Load saved jobs to hydrate map { [jobId]: true }
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/student/saved-jobs", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const rows = await res.json();
        // rows shape: { id, createdAt, job: { id, title, ... }, organization: { ... } }
        const map: Record<string, boolean> = {};
        for (const r of rows ?? []) {
          const id = r?.job?.id ?? r?.jobId ?? r?.id;
          if (id != null) map[String(id)] = true;
        }
        if (mounted) setSaved(map);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Build filter options
  const deptOptions = React.useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => j.dept && set.add(j.dept.trim()));
    return Array.from(set).sort();
  }, [jobs]);

  const locationOptions = React.useMemo(() => {
    const set = new Set<string>();
    jobs.forEach(
      (j) => j.locationMode && set.add(j.locationMode.trim())
    );
    return Array.from(set).sort();
  }, [jobs]);

  // Popular tags (for chips)
  const popularTags = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const job of jobs) {
      for (const tag of job.tags ?? []) {
        const t = tag.trim();
        if (!t) continue;
        counts[t] = (counts[t] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag]) => tag);
  }, [jobs]);

  // Filtering + sorting
  const filtered = React.useMemo(() => {
    const q = normalize(search);
    let rows = jobs.filter((j) => {
      const matchesSearch =
        !q ||
        normalize(j.title).includes(q) ||
        normalize(j.organizationName ?? "").includes(q) ||
        normalize(j.dept ?? "").includes(q) ||
        normalize(j.tags?.join(" ") ?? "").includes(q);

      const matchesDept =
        dept === "all" || normalize(j.dept) === normalize(dept);
      const matchesLocation =
        location === "all" ||
        normalize(j.locationMode) === normalize(location);
      const matchesSaved =
        !showSavedOnly || !!saved[String(j.id)];

      return matchesSearch && matchesDept && matchesLocation && matchesSaved;
    });

    rows = rows.sort((a, b) => {
      if (sort === "title")
        return normalize(a.title).localeCompare(normalize(b.title));
      if (sort === "org")
        return normalize(a.organizationName ?? "").localeCompare(
          normalize(b.organizationName ?? "")
        );
      const ta = new Date(a.postedAt ?? 0).getTime();
      const tb = new Date(b.postedAt ?? 0).getTime();
      return tb - ta; // recent first
    });

    return rows;
  }, [jobs, search, dept, location, sort, showSavedOnly, saved]);

  const selectedJob = React.useMemo(
    () =>
      filtered.find(
        (j) => j.id?.toString() === selectedId?.toString()
      ) ?? null,
    [filtered, selectedId]
  );

  // Deep link ?job=<id>
  React.useEffect(() => {
    if (!selectedId) return;
    const params = new URLSearchParams(Array.from(sp.entries()));
    params.set("job", selectedId.toString());
    router.replace(`?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Keyboard navigation + quick "Apply" shortcut (full application)
  const ids = React.useMemo(
    () => filtered.map((j) => j.id.toString()),
    [filtered]
  );
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!ids.length) return;
      const idx = selectedId ? ids.indexOf(selectedId) : -1;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = ids[Math.min(idx + 1, ids.length - 1)];
        setSelectedId(next);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = ids[Math.max(idx - 1, 0)];
        setSelectedId(prev);
      } else if (e.key.toLowerCase() === "a" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (selectedId) router.push(`/student/jobs/${selectedId}/apply`);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ids, selectedId, router]);

  // Save/Unsave with optimistic update
  async function saveJob(jobId: string | number) {
    const key = String(jobId);
    setSaving((s) => ({ ...s, [key]: true }));
    setSaved((s) => ({ ...s, [key]: true }));
    try {
      const res = await fetch("/api/student/saved-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) throw new Error("Failed to save");
    } catch {
      // rollback
      setSaved((s) => ({ ...s, [key]: false }));
    } finally {
      setSaving((s) => ({ ...s, [key]: false }));
    }
  }

  async function unsaveJob(jobId: string | number) {
    const key = String(jobId);
    setSaving((s) => ({ ...s, [key]: true }));
    setSaved((s) => ({ ...s, [key]: false }));
    try {
      const res = await fetch(
        `/api/student/saved-jobs?jobId=${encodeURIComponent(key)}`,
        {
          method: "DELETE",
        }
      );
      if (!res.ok) throw new Error("Failed to unsave");
    } catch {
      // rollback
      setSaved((s) => ({ ...s, [key]: true }));
    } finally {
      setSaving((s) => ({ ...s, [key]: false }));
    }
  }

  function toggleSave(id: string | number) {
    const key = String(id);
    if (saved[key]) unsaveJob(key);
    else saveJob(key);
  }

  const onSelect = (id: string | number) => setSelectedId(id.toString());

  const totalJobs = jobs.length;
  const totalSaved = Object.values(saved).filter(Boolean).length;

  async function copyJobLink(jobId: string | number) {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      setCopyingLink(true);
      const url = new URL(window.location.href);
      url.searchParams.set("job", String(jobId));
      await navigator.clipboard.writeText(url.toString());
      // later you can replace this with a toast
      alert("Link copied to clipboard");
    } catch {
      alert("Could not copy link.");
    } finally {
      setCopyingLink(false);
    }
  }

  return (
    // 🔧 REMOVED vertical overflow-hidden here
    <div className="w-full max-w-full overflow-x-clip">
      {/* Shell background */}
      <div className="min-h-[100dvh] w-full bg-gradient-to-b from-muted/60 via-background to-muted/80 flex items-stretch justify-center px-2 sm:px-4 py-3 sm:py-4">
        <div className="w-full max-w-6xl flex flex-col">
          {/* Top hero / summary */}
          <header className="mb-3 sm:mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border bg-card px-2.5 py-1 text-[10px] text-muted-foreground">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Live student marketplace · Early access
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                  Browse opportunities
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Discover roles from trusted employers. Save jobs, compare
                  offers, and complete applications in a focused view.
                </p>
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span className="inline-flex items-center rounded-full border border-border bg-card px-2 py-1">
                  Total roles:&nbsp;
                  <span className="font-medium text-foreground">
                    {totalJobs}
                  </span>
                </span>
                <span className="inline-flex items-center rounded-full border border-border bg-card px-2 py-1">
                  Saved:&nbsp;
                  <span className="font-medium text-foreground">
                    {totalSaved}
                  </span>
                </span>
                <span className="inline-flex items-center rounded-full border border-border bg-card px-2 py-1 gap-1">
                  <kbd className="px-1 rounded bg-muted text-[10px]">
                    ↑/↓
                  </kbd>
                  navigate
                  <span className="mx-1">·</span>
                  <kbd className="px-1 rounded bg-muted text-[10px]">
                    ⌘/Ctrl + A
                  </kbd>
                  apply
                </span>
              </div>

              {popularTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground pr-1">
                    Popular searches:
                  </span>
                  {popularTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setSearch(tag)}
                      className="inline-flex items-center rounded-full bg-secondary/70 text-secondary-foreground px-2.5 py-1 text-[11px] hover:bg-secondary transition"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Saved only toggle */}
            <div className="flex items-end justify-start sm:justify-end">
              <button
                type="button"
                onClick={() => setShowSavedOnly((v) => !v)}
                className={`inline-flex items-center rounded-full border px-3 py-1.5 transition text-xs shadow-sm ${
                  showSavedOnly
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                <span
                  className={`mr-1 inline-flex h-2 w-2 rounded-full ${
                    showSavedOnly
                      ? "bg-primary-foreground"
                      : "bg-muted-foreground"
                  }`}
                />
                Show saved only
              </button>
            </div>
          </header>

          {/* Main card container */}
          <div className="rounded-xl border bg-card shadow-md">
            {/* 🔧 REMOVED overflow-hidden on grid container */}
            <div className="grid grid-cols-[clamp(280px,30vw,420px)_minmax(0,1fr)] max-w-full">
              {/* LEFT: filters + list */}
              <aside className="border-r bg-muted/70 max-h-[75vh] flex flex-col min-w-0">
                {/* Sticky controls */}
                <div className="p-3 border-b bg-muted/90 backdrop-blur z-10 space-y-3 sticky top-0">
                  <div className="flex gap-2 min-w-0">
                    <div className="relative flex-1 min-w-0">
                      <Input
                        placeholder="Search by title, company, or tags…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="min-w-0 pr-8 text-sm"
                      />
                      <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px] text-muted-foreground">
                        ⌘/Ctrl + F
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearch("");
                        setDept("all");
                        setLocation("all");
                        setSort("recent");
                        setShowSavedOnly(false);
                      }}
                      className="shrink-0 text-xs"
                    >
                      Reset
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Select value={dept} onValueChange={setDept}>
                      <SelectTrigger className="w-full h-8 text-xs">
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All depts</SelectItem>
                        {deptOptions.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={location} onValueChange={setLocation}>
                      <SelectTrigger className="w-full h-8 text-xs">
                        <SelectValue placeholder="Location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All locations</SelectItem>
                        {locationOptions.map((l) => (
                          <SelectItem key={l} value={l}>
                            {l}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={sort} onValueChange={setSort}>
                      <SelectTrigger className="w-full h-8 text-xs">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recent">Most recent</SelectItem>
                        <SelectItem value="title">Title (A–Z)</SelectItem>
                        <SelectItem value="org">Company (A–Z)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>
                      Showing{" "}
                      <span className="font-medium text-foreground">
                        {filtered.length}
                      </span>{" "}
                      {showSavedOnly ? "saved job(s)" : "job(s)"}
                    </span>
                  </div>
                </div>

                {/* 🔧 Left list scrollable */}
                <div className="flex-1 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <div className="p-6 text-sm text-muted-foreground space-y-3">
                      <p className="font-medium text-foreground">
                        No jobs match your filters.
                      </p>
                      {showSavedOnly ? (
                        <p className="text-xs">
                          You don&apos;t have any saved jobs that match these
                          filters yet. Try turning off{" "}
                          <span className="font-medium">saved only</span> or
                          broadening your search.
                        </p>
                      ) : (
                        <p className="text-xs">
                          Try clearing your filters or searching with fewer
                          keywords.
                        </p>
                      )}
                    </div>
                  ) : (
                    <ul className="divide-y divide-border/70">
                      {filtered.map((j) => {
                        const active =
                          selectedId?.toString() === j.id?.toString();
                        const key = j.id.toString();
                        const savedFlag = !!saved[key];
                        const busy = !!saving[key];

                        const isRemote = normalize(j.locationMode) === "remote";
                        const isHybrid = normalize(j.locationMode) === "hybrid";
                        const isOnsite =
                          normalize(j.locationMode) === "onsite";

                        const d = daysSince(j.postedAt);
                        const isNew = d !== null && d <= 7;

                        return (
                          <li key={j.id}>
                            <button
                              onClick={() => onSelect(j.id)}
                              className={`group w-full text-left px-3 py-3 transition ${
                                active
                                  ? "bg-accent"
                                  : "hover:bg-accent/60"
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                {/* Logo / initials */}
                                {j.organizationLogoUrl ? (
                                  <img
                                    src={j.organizationLogoUrl}
                                    alt={`${
                                      j.organizationName || "Company"
                                    } logo`}
                                    className="h-10 w-10 rounded-xl object-cover shrink-0 border border-border bg-card"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-sm font-semibold shrink-0 border border-border">
                                    {j.organizationName?.[0]?.toUpperCase() ??
                                      "•"}
                                  </div>
                                )}

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1">
                                        <div className="text-sm font-semibold truncate">
                                          {j.title}
                                        </div>
                                        {isNew && (
                                          <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 text-[10px]">
                                            New
                                          </span>
                                        )}
                                      </div>
                                      <div className="mt-0.5 text-xs text-muted-foreground truncate">
                                        {j.organizationName ?? "—"}
                                        {j.dept ? ` • ${j.dept}` : ""}
                                      </div>
                                      <div className="mt-1 flex flex-wrap gap-1">
                                        {j.locationMode && (
                                          <span
                                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] ${
                                              isRemote
                                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                : isHybrid
                                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                                : isOnsite
                                                ? "border-sky-200 bg-sky-50 text-sky-700"
                                                : "border-border bg-muted text-muted-foreground"
                                            }`}
                                          >
                                            {j.locationMode}
                                          </span>
                                        )}
                                        {j.tags?.slice(0, 3).map((t) => (
                                          <span
                                            key={t}
                                            className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground"
                                          >
                                            {t}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                      {j.postedAt ? (
                                        <span className="text-[11px] px-2 py-1 rounded-full bg-muted text-muted-foreground">
                                          {timeAgo(j.postedAt)}
                                        </span>
                                      ) : null}
                                      <Button
                                        size="sm"
                                        variant={
                                          savedFlag ? "default" : "outline"
                                        }
                                        disabled={busy}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleSave(j.id);
                                        }}
                                        className="h-7 text-xs px-3"
                                      >
                                        {busy
                                          ? "…"
                                          : savedFlag
                                          ? "Saved"
                                          : "Save"}
                                      </Button>
                                    </div>
                                  </div>
                                  {j.salaryRange ? (
                                    <div className="mt-1 text-[11px] text-muted-foreground">
                                      {j.salaryRange}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </aside>

              {/* RIGHT: detail (independent scroll) */}
              {/* 🔧 Make right side darker + scrollable */}
              <section className="bg-background max-h-[75vh] overflow-y-auto min-w-0">
                {!selectedJob ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground px-4 text-center gap-3">
                    <div className="text-sm font-medium text-foreground">
                      Select a job to view details
                    </div>
                    <p className="text-xs max-w-xs">
                      Use the list on the left, or start typing in the search
                      bar to narrow down roles. When something looks promising,
                      open the full application flow and tailor your responses.
                    </p>
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto pb-6">
                    {/* Sticky header / actions (sticks within this scroll area) */}
                    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
                      <div className="px-4 sm:px-6 pt-4 pb-3 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          {selectedJob.organizationLogoUrl ? (
                            <img
                              src={selectedJob.organizationLogoUrl}
                              alt={`${
                                selectedJob.organizationName || "Company"
                              } logo`}
                              className="h-12 w-12 rounded-2xl object-cover shrink-0 border border-border bg-card"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-base font-semibold shrink-0 border border-border">
                              {selectedJob.organizationName
                                ?.slice(0, 2)
                                ?.toUpperCase() || "•"}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight truncate">
                              {selectedJob.title}
                            </h2>
                            <div className="mt-1 text-sm text-muted-foreground truncate">
                              {selectedJob.organizationName ?? "—"}
                              {selectedJob.dept ? ` • ${selectedJob.dept}` : ""}
                              {selectedJob.locationMode
                                ? ` • ${selectedJob.locationMode}`
                                : ""}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                              {selectedJob.salaryRange ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-muted-foreground">
                                  {selectedJob.salaryRange}
                                </span>
                              ) : null}
                              {selectedJob.postedAt ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted text-muted-foreground">
                                  Posted {timeAgo(selectedJob.postedAt)}
                                </span>
                              ) : null}
                              {selectedJob.organizationWebsite ? (
                                <a
                                  href={selectedJob.organizationWebsite}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  Visit website
                                </a>
                              ) : null}
                            </div>
                            {selectedJob.tags?.length ? (
                              <div className="mt-2 flex flex-wrap gap-1 pb-1">
                                {selectedJob.tags.slice(0, 8).map((t) => (
                                  <span
                                    key={t}
                                    className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground"
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="shrink-0 flex flex-col gap-2 items-end">
                          <Button
                            variant={
                              saved[selectedJob.id.toString()]
                                ? "default"
                                : "outline"
                            }
                            disabled={!!saving[selectedJob.id.toString()]}
                            onClick={() => toggleSave(selectedJob.id)}
                            className="h-8 text-xs px-3"
                          >
                            {saving[selectedJob.id.toString()]
                              ? "…"
                              : saved[selectedJob.id.toString()]
                              ? "Saved"
                              : "Save"}
                          </Button>
                          <Button
                            size="sm"
                            className="text-xs"
                            onClick={() =>
                              router.push(
                                `/student/jobs/${selectedJob.id}/apply`
                              )
                            }
                          >
                            Apply now
                          </Button>
                          <button
                            type="button"
                            onClick={() => copyJobLink(selectedJob.id)}
                            className="mt-1 text-[10px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
                            disabled={copyingLink}
                          >
                            {copyingLink ? "Copying…" : "Copy shareable link"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="px-4 sm:px-6 mt-5">
                      <h3 className="text-sm font-semibold text-foreground mb-3">
                        About this role
                      </h3>
                      {/* 🔧 darker container */}
                      <div className="rounded-lg border bg-muted px-3 py-3">
                        {selectedJob.descriptionMd ? (
                          <CollapsibleText
                            text={selectedJob.descriptionMd}
                            previewChars={900}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No description provided.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer helper */}
                    <div className="px-4 sm:px-6 mt-8 pt-4 border-t text-xs text-muted-foreground flex flex-wrap gap-2 items-center">
                      <span className="font-medium text-foreground">
                        Power tips
                      </span>
                      <span>Use</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-muted">
                        ↑
                      </kbd>
                      /
                      <kbd className="px-1.5 py-0.5 rounded bg-muted">
                        ↓
                      </kbd>
                      <span>to move between jobs,</span>
                      <kbd className="px-1.5 py-0.5 rounded bg-muted">
                        ⌘/Ctrl
                      </kbd>
                      +
                      <kbd className="px-1.5 py-0.5 rounded bg-muted">
                        A
                      </kbd>
                      <span>to jump straight into the application page.</span>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Top-level page ---------- */

export default function JobsPage() {
  const [jobs, setJobs] = React.useState<Job[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/jobs", { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) setJobs([]);
          return;
        }
        const data = await res.json();
        // assuming /api/jobs returns an array; adjust if shape is { jobs: [...] }
        const list = Array.isArray(data) ? data : data?.jobs ?? [];
        if (!cancelled) setJobs(list);
      } catch (e) {
        console.error("Failed to load jobs", e);
        if (!cancelled) setJobs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="h-[100dvh] w-full flex items-center justify-center bg-gradient-to-b from-muted/60 via-background to-muted/80">
        <div className="rounded-xl border bg-card px-4 py-3 shadow-sm text-sm text-muted-foreground flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading opportunities…
        </div>
      </div>
    );
  }

  return (
    // 🔧 Allow vertical scrolling on the page; only clip X
    <div className="min-h-[100dvh] max-w-full overflow-x-clip">
      <JobBrowserInner jobs={jobs} />
    </div>
  );
}
