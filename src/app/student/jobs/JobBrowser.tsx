"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ApplyDialog from "./ApplyDialog";

/* ---------- Types ---------- */
type Job = {
  id: number | string;
  orgId?: number | string;
  organizationName?: string | null;
  organizationLogoUrl?: string | null;
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

export default function JobBrowser({ initialJobs }: { initialJobs: Job[] }) {
  const router = useRouter();
  const sp = useSearchParams();

  const initialSelected = sp.get("job") ?? (initialJobs[0]?.id?.toString() ?? null);

  const [selectedId, setSelectedId] = React.useState<string | null>(initialSelected);
  const [search, setSearch] = React.useState("");
  const [dept, setDept] = React.useState<string>("all");
  const [location, setLocation] = React.useState<string>("all");
  const [sort, setSort] = React.useState<string>("recent"); // recent | title | org
  const [applyOpen, setApplyOpen] = React.useState(false);
  const [saved, setSaved] = React.useState<Record<string, boolean>>({});

  // Build filter options from data
  const deptOptions = React.useMemo(() => {
    const set = new Set<string>();
    initialJobs.forEach((j) => j.dept && set.add(j.dept.trim()));
    return Array.from(set).sort();
  }, [initialJobs]);

  const locationOptions = React.useMemo(() => {
    const set = new Set<string>();
    initialJobs.forEach((j) => j.locationMode && set.add(j.locationMode.trim()));
    return Array.from(set).sort();
  }, [initialJobs]);

  // Filtering + sorting
  const filtered = React.useMemo(() => {
    const q = normalize(search);
    let rows = initialJobs.filter((j) => {
      const matchesSearch =
        !q ||
        normalize(j.title).includes(q) ||
        normalize(j.organizationName ?? "").includes(q) ||
        normalize(j.dept ?? "").includes(q) ||
        normalize(j.tags?.join(" ") ?? "").includes(q);

      const matchesDept = dept === "all" || normalize(j.dept) === normalize(dept);
      const matchesLocation =
        location === "all" || normalize(j.locationMode) === normalize(location);

      return matchesSearch && matchesDept && matchesLocation;
    });

    rows = rows.sort((a, b) => {
      if (sort === "title") return normalize(a.title).localeCompare(normalize(b.title));
      if (sort === "org")
        return normalize(a.organizationName ?? "").localeCompare(normalize(b.organizationName ?? ""));
      const ta = new Date(a.postedAt ?? 0).getTime();
      const tb = new Date(b.postedAt ?? 0).getTime();
      return tb - ta; // recent first
    });

    return rows;
  }, [initialJobs, search, dept, location, sort]);

  const selectedJob = React.useMemo(
    () => filtered.find((j) => j.id?.toString() === selectedId?.toString()) ?? null,
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

  // Keyboard navigation
  const ids = React.useMemo(() => filtered.map((j) => j.id.toString()), [filtered]);
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
        if (selectedId) setApplyOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ids, selectedId]);

  // Save / bookmark (local demo)
  function toggleSave(id: string | number) {
    const key = id.toString();
    setSaved((s) => ({ ...s, [key]: !s[key] }));
  }

  const onSelect = (id: string | number) => setSelectedId(id.toString());

  return (
    // IMPORTANT: remove the md: breakpoint so it’s ALWAYS two columns.
    <div className="grid h-full w-full grid-cols-[380px_minmax(0,1fr)] overflow-hidden">
      {/* LEFT: filters + list */}
      <aside className="border-r bg-background h-full flex flex-col">
        {/* Sticky controls */}
        <div className="p-3 border-b sticky top-0 bg-background/95 backdrop-blur z-10 space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Search jobs, companies, tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button
              variant="secondary"
              onClick={() => {
                setSearch("");
                setDept("all");
                setLocation("all");
                setSort("recent");
              }}
              className="whitespace-nowrap"
            >
              Reset
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Depts</SelectItem>
                {deptOptions.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={location} onValueChange={setLocation}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locationOptions.map((l) => (
                  <SelectItem key={l} value={l}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="title">Title (A–Z)</SelectItem>
                <SelectItem value="org">Company (A–Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-xs text-muted-foreground">
            Showing <span className="font-medium">{filtered.length}</span> jobs
          </div>
        </div>

        {/* List (independent scroll) */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No jobs match your filters.</div>
          ) : (
            <ul className="divide-y">
              {filtered.map((j) => {
                const active = selectedId?.toString() === j.id?.toString();
                const savedFlag = !!saved[j.id.toString()];
                return (
                  <li key={j.id}>
                    <button
                      onClick={() => onSelect(j.id)}
                      className={`group w-full text-left p-4 transition ${
                        active ? "bg-accent/60" : "hover:bg-accent/40"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Logo / initials */}
                        <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center text-sm font-semibold shrink-0">
                          {j.organizationName?.[0]?.toUpperCase() ?? "•"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-base font-semibold truncate">{j.title}</div>
                              <div className="text-sm text-muted-foreground truncate">
                                {j.organizationName ?? "—"}
                                {j.dept ? ` • ${j.dept}` : ""}
                                {j.locationMode ? ` • ${j.locationMode}` : ""}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {j.postedAt ? (
                                <span className="text-[11px] px-2 py-1 rounded-full bg-muted text-muted-foreground">
                                  {timeAgo(j.postedAt)}
                                </span>
                              ) : null}
                              <Button
                                size="sm"
                                variant={savedFlag ? "default" : "outline"}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleSave(j.id);
                                }}
                              >
                                {savedFlag ? "Saved" : "Save"}
                              </Button>
                            </div>
                          </div>
                          {/* Tags line */}
                          {j.tags?.length ? (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {j.tags.slice(0, 5).map((t) => (
                                <span
                                  key={t}
                                  className="text-[11px] px-2 py-1 rounded-full bg-secondary text-secondary-foreground"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          ) : null}
                          {j.salaryRange ? (
                            <div className="mt-2 text-xs text-muted-foreground">{j.salaryRange}</div>
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
      <section className="h-full overflow-y-auto">
        {!selectedJob ? (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            Select a job to view details
          </div>
        ) : (
          <div className="max-w-4xl p-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b pb-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center text-base font-semibold shrink-0">
                  {selectedJob.organizationName?.[0]?.toUpperCase() ?? "•"}
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-semibold tracking-tight truncate">
                    {selectedJob.title}
                  </h1>
                  <div className="mt-1 text-sm text-muted-foreground truncate">
                    {selectedJob.organizationName ?? "—"}
                    {selectedJob.dept ? ` • ${selectedJob.dept}` : ""}
                    {selectedJob.locationMode ? ` • ${selectedJob.locationMode}` : ""}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedJob.salaryRange ? (
                      <span className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground">
                        {selectedJob.salaryRange}
                      </span>
                    ) : null}
                    {selectedJob.postedAt ? (
                      <span className="text-[11px] px-2 py-1 rounded-md bg-muted text-muted-foreground">
                        Posted {timeAgo(selectedJob.postedAt)}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex gap-2">
                <Button
                  variant={saved[selectedJob.id.toString()] ? "default" : "outline"}
                  onClick={() => toggleSave(selectedJob.id)}
                >
                  {saved[selectedJob.id.toString()] ? "Saved" : "Save"}
                </Button>
                <Button onClick={() => setApplyOpen(true)}>Apply</Button>
              </div>
            </div>

            {/* Body */}
            <div className="mt-6 prose prose-sm max-w-none dark:prose-invert leading-relaxed">
              {selectedJob.descriptionMd ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {selectedJob.descriptionMd}
                </ReactMarkdown>
              ) : (
                <p className="text-muted-foreground">No description provided.</p>
              )}
            </div>

            {/* Apply dialog */}
            <ApplyDialog
              open={applyOpen}
              onOpenChange={setApplyOpen}
              jobId={selectedJob.id}
              jobTitle={selectedJob.title}
            />

            {/* Footer helper */}
            <div className="mt-8 pt-4 border-t text-xs text-muted-foreground">
              Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-muted">⌘/Ctrl</kbd> +{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-muted">A</kbd> to open Apply. Use{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-muted">↑</kbd> /{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-muted">↓</kbd> to move.
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
