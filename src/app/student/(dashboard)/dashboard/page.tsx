// src/app/student/(dashboard)/dashboard/page.tsx
import Link from "next/link";
import { headers } from "next/headers";
import {
  ArrowRight,
  Bell,
  Briefcase,
  Calendar,
  Check,
  ChevronRight,
  FileText,
  Heart,
  Inbox,
  Search,
  Sparkles,
  TrendingUp,
  User2,
} from "lucide-react";

export const dynamic = "force-dynamic";

/* ----------------------------- Types ----------------------------- */
type Stage =
  | "submitted"
  | "in_review"
  | "assessment"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

type Application = {
  id: number;
  jobId?: number | null;
  stage?: Stage | string | null;
  appliedAt?: string | null;
  updatedAt?: string | null;
  job?: {
    id: number;
    title: string | null;
    locationMode?: string | null;
    salaryRange?: string | null;
    organization?: { name?: string | null } | null;
  } | null;
  // fallback guesses from legacy fields
  jobTitle?: string | null;
  organizationName?: string | null;
};

type SavedJob = {
  id: number;
  jobId: number;
  job?: {
    id: number;
    title: string | null;
    locationMode?: string | null;
    salaryRange?: string | null;
    organization?: { name?: string | null } | null;
  } | null;
};

type Profile = {
  id: number;
  name?: string | null;
  program?: string | null;
  gradYear?: string | number | null;
  isPublic?: boolean | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  resumeUrl?: string | null;
  linkedinUrl?: string | null;
  github?: string | null;
};

/* ----------------------------- Normalizers & Helpers ----------------------------- */
function get<T = any>(obj: any, keys: string[], fallback: any = null): T {
  for (const k of keys) {
    if (obj && obj[k] != null) return obj[k] as T;
  }
  return fallback as T;
}

// Map any API shape → our Application shape
function normalizeApp(raw: any): Application {
  const id = get<number>(raw, ["id", "applicationId"]);
  const jobId = get<number | null>(raw, ["jobId", "job_id", "job?.id"], raw?.job?.id ?? null);
  const stageRaw = get<string | null>(raw, ["stage", "status"], null);
  const appliedAt =
    get<string | null>(raw, ["appliedAt", "applied_at", "createdAt", "created_at"], null);
  const updatedAt = get<string | null>(raw, ["updatedAt", "updated_at"], appliedAt);

  // Nested job if present
  const job = raw?.job
    ? {
        id: raw.job.id,
        title: get<string | null>(raw.job, ["title", "jobTitle"], null),
        locationMode: get<string | null>(raw.job, ["locationMode", "location_mode"], null),
        salaryRange: get<string | null>(raw.job, ["salaryRange", "salary_range"], null),
        organization: raw.job.organization
          ? { name: get<string | null>(raw.job.organization, ["name", "organizationName"], null) }
          : null,
      }
    : null;

  // Legacy top-level fields
  const jobTitle = get<string | null>(raw, ["jobTitle", "job_title", "title"], job?.title ?? null);
  const organizationName = get<string | null>(
    raw,
    ["organizationName", "organization_name", "company", "companyName"],
    job?.organization?.name ?? null
  );

  return {
    id,
    jobId: jobId ?? job?.id ?? null,
    stage: stageRaw,
    appliedAt,
    updatedAt,
    job,
    jobTitle,
    organizationName,
  };
}

function normStage(s?: string | null): Stage {
  const v = (s ?? "submitted").toLowerCase() as Stage;
  const known: Stage[] = [
    "submitted",
    "in_review",
    "assessment",
    "interview",
    "offer",
    "rejected",
    "withdrawn",
  ];
  return known.includes(v) ? v : "submitted";
}

function stageLabel(s: Stage) {
  switch (s) {
    case "submitted":
      return "Submitted";
    case "in_review":
      return "In Review";
    case "assessment":
      return "Assessment";
    case "interview":
      return "Interview";
    case "offer":
      return "Offer";
    case "rejected":
      return "Rejected";
    case "withdrawn":
      return "Withdrawn";
  }
}

function stageTone(s: Stage) {
  switch (s) {
    case "offer":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200";
    case "interview":
      return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"; // << green, not blue
    case "assessment":
      return "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200";
    case "in_review":
      return "bg-neutral-100 text-neutral-900 dark:bg-neutral-900 dark:text-neutral-200";
    case "rejected":
    case "withdrawn":
      return "bg-rose-100 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200";
    default:
      return "bg-stone-100 text-stone-900 dark:bg-stone-900 dark:text-stone-200";
  }
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(dt);
  } catch {
    return "—";
  }
}

function timeAgo(d?: string | null) {
  if (!d) return "—";
  const now = Date.now();
  const then = new Date(d).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function pct(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}
function computeProfileCompletion(me: Profile) {
  const fields = [
    !!me.name,
    !!me.program,
    !!me.gradYear,
    !!me.city,
    !!me.email,
    !!me.phone,
    !!me.resumeUrl,
    !!me.linkedinUrl,
  ];
  const score = (fields.filter(Boolean).length / fields.length) * 100;
  return pct(score || 0);
}

// If title/org missing but jobId exists, fetch job to hydrate
async function hydrateMissingJobs(
  base: string,
  cookie: string,
  apps: Application[]
): Promise<Application[]> {
  const need = apps.filter((a) => {
    const hasTitle = a.job?.title || a.jobTitle;
    const hasOrg = a.job?.organization?.name || a.organizationName;
    return (!hasTitle || !hasOrg) && a.jobId;
  });

  if (need.length === 0) return apps;

  const fetches = need.map((a) =>
    fetch(`${base}/api/jobs/${a.jobId}?include=organization`, {
      headers: { cookie },
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
  );
  const results = await Promise.allSettled(fetches);

  const map = new Map<number, any>();
  results.forEach((res, i) => {
    const app = need[i];
    if (res.status === "fulfilled" && res.value) map.set(app.jobId as number, res.value);
  });

  return apps.map((a) => {
    if (!a.jobId || map.size === 0) return a;
    const job = map.get(a.jobId);
    if (!job) return a;

    const patched: Application = {
      ...a,
      job: {
        id: job.id,
        title: get(job, ["title", "jobTitle"], a.job?.title ?? a.jobTitle ?? null),
        locationMode: get(job, ["locationMode", "location_mode"], a.job?.locationMode ?? null),
        salaryRange: get(job, ["salaryRange", "salary_range"], a.job?.salaryRange ?? null),
        organization: job.organization
          ? {
              name: get(
                job.organization,
                ["name", "organizationName"],
                a.job?.organization?.name ?? a.organizationName ?? null
              ),
            }
          : a.job?.organization ?? null,
      },
      jobTitle: get(job, ["title", "jobTitle"], a.jobTitle ?? null),
      organizationName: get(job?.organization ?? {}, ["name", "organizationName"], a.organizationName ?? null),
    };
    return patched;
  });
}

/* ----------------------------- Page ----------------------------- */
type AppNorm = Application & { stage: Stage }; // <<< ensures stage is always Stage

export default async function StudentDashboardPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const protocol = h.get("x-forwarded-proto") || "http";
  const base = `${protocol}://${host}`;
  const cookie = h.get("cookie") ?? "";

  // Profile
  const profileRes = await fetch(`${base}/api/student/profile`, {
    cache: "no-store",
    headers: { cookie },
  });
  if (!profileRes.ok) {
    return (
      <div className="p-8 text-center text-destructive">
        Failed to load dashboard — please log in again.
      </div>
    );
  }
  const me: Profile = await profileRes.json();

  // Applications (normalize → hydrate → normalize again + type-safe)
  const appsRes = await fetch(
    `${base}/api/applications?mine=1&limit=120&include=job,organization`,
    {
      cache: "no-store",
      headers: { cookie },
    }
  );
  const rawApps: any[] = appsRes.ok ? await appsRes.json() : [];

  let apps: AppNorm[] = rawApps
    .map(normalizeApp)
    .map((a) => ({ ...a, stage: normStage(a.stage as any) })) as AppNorm[];

  apps = (await hydrateMissingJobs(base, cookie, apps)).map(
    (a) => ({ ...a, stage: normStage(a.stage as any) } as AppNorm)
  );

  // Saved jobs
  const savedRes = await fetch(
    `${base}/api/student/saved-jobs?mine=1&include=job,organization`,
    {
      cache: "no-store",
      headers: { cookie },
    }
  );
  const saved: SavedJob[] = savedRes.ok ? await savedRes.json() : [];

  // Derivations
  const counts = {
    total: apps.length,
    active: apps.filter((a) => !["rejected", "withdrawn"].includes(a.stage)).length,
    interviews: apps.filter((a) => a.stage === "interview").length,
    offers: apps.filter((a) => a.stage === "offer").length,
    inReview: apps.filter((a) => a.stage === "in_review").length,
  };

  const recent = [...apps]
    .sort(
      (a, b) =>
        new Date(b.updatedAt ?? b.appliedAt ?? 0).getTime() -
        new Date(a.updatedAt ?? a.appliedAt ?? 0).getTime()
    )
    .slice(0, 6);

  const interviews = apps.filter((a) => a.stage === "interview").slice(0, 4);

  const completion = computeProfileCompletion(me);
  const name = me?.name?.trim() || "Student";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Hero with greener gradient */}
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-emerald-100/70 via-emerald-50 to-transparent dark:from-emerald-900/40 dark:via-emerald-900/20">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="relative grid gap-4 p-6 sm:p-8 lg:grid-cols-3 lg:gap-6">
          <div className="lg:col-span-2">
            <div className="inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1 text-xs font-medium backdrop-blur dark:bg-black/30">
              <Sparkles className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-300" />
              Personalized dashboard
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              Welcome back, {name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track applications, interviews, and saved roles — all in one place.
            </p>

            {/* KPI Row — Glass tiles */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi
                title="Active"
                value={counts.active}
                hint="excludes closed"
                icon={<TrendingUp className="h-4 w-4" />}
              />
              <Kpi title="Interviews" value={counts.interviews} icon={<Calendar className="h-4 w-4" />} />
              <Kpi title="Offers" value={counts.offers} icon={<Check className="h-4 w-4" />} />
              <Kpi title="In Review" value={counts.inReview} icon={<Inbox className="h-4 w-4" />} />
            </div>

            {/* Quick actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/student/jobs" className="btn-primary">
                <Search className="h-4 w-4" />
                Find jobs
              </Link>
              <Link href="/student/applications" className="btn-soft">
                <Briefcase className="h-4 w-4" />
                View applications
              </Link>
              <Link href="/student/profile" className="btn-soft">
                <User2 className="h-4 w-4" />
                Edit profile
              </Link>
            </div>
          </div>

          {/* Profile completion card */}
          <div className="rounded-2xl border bg-white/70 p-5 backdrop-blur dark:bg-black/30">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Profile strength</p>
              <span className="text-xs text-muted-foreground">{completion}%</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-emerald-600 transition-[width] duration-500"
                style={{ width: `${completion}%` }}
              />
            </div>
            <ul className="mt-4 space-y-2 text-sm">
              <ProfileRow label="Program" value={me.program} />
              <ProfileRow label="Grad year" value={me.gradYear ? String(me.gradYear) : ""} />
              <ProfileRow label="City" value={me.city} />
              <ProfileRow label="Resume" value={me.resumeUrl ? "Uploaded" : ""} />
              <ProfileRow label="LinkedIn" value={me.linkedinUrl ? "Added" : ""} />
            </ul>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link href="/student/profile" className="btn-outline">
                Improve
              </Link>
              <Link href="/student/settings" className="btn-primary">
                Settings
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main grid: Recent + Side rail */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Applications */}
        <section className="space-y-3 lg:col-span-2">
          <HeaderRow
            title="Recent applications"
            action={
              <Link href="/student/applications" className="link subtle">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {recent.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-6 w-6 text-muted-foreground" />}
              title="No applications yet"
              desc="Start applying to roles that match your interests."
              cta={
                <Link href="/student/jobs" className="btn-primary">
                  <Search className="h-4 w-4" />
                  Browse jobs
                </Link>
              }
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {recent.map((a) => (
                <ApplicationCard key={a.id} app={a} />
              ))}
            </div>
          )}
        </section>

        {/* Side rail */}
        <aside className="space-y-6">
          {/* Upcoming Interviews */}
          <CardBlock
            title="Upcoming interviews"
            action={
              <Link href="/student/applications?stage=interview" className="link">
                See all
              </Link>
            }
          >
            {interviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No interviews scheduled. Keep applying!
              </p>
            ) : (
              <div className="space-y-3">
                {interviews.map((a) => (
                  <Link
                    key={a.id}
                    href={`/student/applications/${a.id}`}
                    className="group flex items-start justify-between rounded-xl border p-3 hover:bg-muted/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{appTitle(a)}</p>
                      <p className="truncate text-xs text-muted-foreground">{appOrg(a) ?? "—"}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Updated {timeAgo(a.updatedAt ?? a.appliedAt)}
                      </p>
                    </div>
                    <div className="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                      <Calendar className="h-4 w-4" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardBlock>

          {/* Saved Jobs */}
          <CardBlock
            title="Saved jobs"
            action={<Link href="/student/jobs?saved=1" className="link">Manage</Link>}
          >
            <div className="text-sm text-muted-foreground">
              {saved.length === 0 ? (
                "You haven’t saved any roles yet."
              ) : (
                <div className="space-y-3">
                  {saved.slice(0, 5).map((s) => (
                    <Link
                      key={s.id}
                      href={`/student/jobs/${s.jobId}`}
                      className="group flex items-start gap-3 rounded-xl border p-3 hover:bg-muted/60"
                    >
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-muted">
                        <Heart className="h-4 w-4 text-muted-foreground group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.job?.title ?? "Untitled role"}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.job?.organization?.name ?? "—"}
                          {s.job?.locationMode ? ` • ${s.job.locationMode}` : ""}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </CardBlock>

          {/* Announcements / Tips */}
          <CardBlock title="Tips & updates">
            <div className="flex items-start gap-3 rounded-xl border p-3">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium">Make your profile public</p>
                <p className="text-xs text-muted-foreground">
                  Recruiters can discover you faster across partnered universities.
                </p>
                <div className="mt-2">
                  <Link href="/student/settings" className="link">
                    Go to settings
                  </Link>
                </div>
              </div>
            </div>
          </CardBlock>
        </aside>
      </div>

      {/* Inline styles to keep it single-file */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          .btn-primary{
            display:inline-flex;align-items:center;gap:.5rem;border-radius:1rem;
            border:1px solid hsl(var(--border));
            background:hsl(var(--primary)); /* uses your theme primary; keep if primary is your green */
            color:hsl(var(--primary-foreground));padding:.6rem .9rem;font-size:.875rem;font-weight:600;
            transition:opacity .15s ease, transform .06s ease;
          }
          .btn-primary:hover{opacity:.9}
          .btn-primary:active{transform:translateY(1px)}
          .btn-soft{
            display:inline-flex;align-items:center;gap:.5rem;border-radius:1rem;
            border:1px solid hsl(var(--border));background:hsl(var(--muted));
            color:hsl(var(--foreground));padding:.6rem .9rem;font-size:.875rem;font-weight:600;
            transition:background .15s ease, transform .06s ease;
          }
          .btn-soft:hover{background: color-mix(in oklab, hsl(var(--muted)), hsl(var(--foreground)) 6%)}
          .btn-soft:active{transform:translateY(1px)}
          .btn-outline{
            display:inline-flex;align-items:center;justify-content:center;border-radius:.9rem;
            border:1px solid hsl(var(--border));background:transparent;color:hsl(var(--foreground));
            padding:.55rem .8rem;font-size:.85rem;font-weight:600;
          }
          .link{font-size:.8125rem;color:hsl(var(--primary));display:inline-flex;align-items:center;gap:.35rem}
          .link.subtle{font-size:.8125rem;color:hsl(var(--primary));opacity:.9}
        `,
        }}
      />
    </div>
  );
}

/* ----------------------------- UI Bits ----------------------------- */
function HeaderRow({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      {action}
    </div>
  );
}

function Kpi({
  title,
  value,
  hint,
  icon,
}: {
  title: string;
  value: number | string;
  hint?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white/70 p-4 backdrop-blur shadow-sm dark:bg-black/30">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <div className="text-muted-foreground">{icon}</div>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  desc,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white p-8 text-center shadow-sm dark:bg-neutral-900">
      <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-muted">
        {icon}
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}

function CardBlock({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm dark:bg-neutral-900">
      <div className="flex items-center justify-between p-4">
        <h3 className="text-sm font-medium">{title}</h3>
        {action}
      </div>
      <div className="border-t" />
      <div className="p-4">{children}</div>
    </div>
  );
}

/** Title/org helpers that use hydrated job or legacy fields */
function appTitle(a: Application) {
  return a.job?.title ?? a.jobTitle ?? "Untitled role";
}
function appOrg(a: Application) {
  return a.job?.organization?.name ?? a.organizationName ?? null;
}

function ApplicationCard({ app }: { app: Application }) {
  const s = normStage(app.stage as string);
  return (
    <Link
      href={`/student/applications/${app.id}`}
      className="group rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md dark:bg-neutral-900"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{appTitle(app)}</p>
          <p className="truncate text-xs text-muted-foreground">
            {appOrg(app) ?? "—"}
            {app.job?.locationMode ? ` • ${app.job.locationMode}` : ""}
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${stageTone(
            s
          )}`}
        >
          {stageLabel(s)}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>Applied {fmtDate(app.appliedAt)}</span>
        <span>Updated {timeAgo(app.updatedAt ?? app.appliedAt)}</span>
      </div>
    </Link>
  );
}

function ProfileRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">
        {value && value !== "" ? value : <span className="text-muted-foreground">—</span>}
      </span>
    </div>
  );
}
