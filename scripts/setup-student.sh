#!/usr/bin/env bash
set -euo pipefail

# Run from the repo root (where src/ lives)

ensure_dir() {
  local d="$1"
  if [[ ! -d "$d" ]]; then
    echo "➕ mkdir -p $d"
    mkdir -p "$d"
  else
    echo "✔︎ exists: $d"
  fi
}

ensure_file() {
  local f="$1"
  local content="$2"
  if [[ ! -e "$f" ]]; then
    echo "➕ create: $f"
    mkdir -p "$(dirname "$f")"
    printf "%s" "$content" > "$f"
  else
    echo "✔︎ exists: $f"
  fi
}

# ------------------------------------------------------------------------------
# 1) Routes & Folders to Create  (student portal)
# ------------------------------------------------------------------------------

ensure_dir "src/app/student"
ensure_dir "src/app/student/(dashboard)/dashboard"
ensure_dir "src/app/student/jobs/[id]"
ensure_dir "src/app/student/applications/[id]"
ensure_dir "src/app/student/profile"
ensure_dir "src/app/student/settings"

ensure_file "src/app/student/layout.tsx" \
'import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/src/lib/auth";
import { requireStudent } from "@/src/lib/rbac";
import StudentSidebar from "@/src/components/student/StudentSidebar";
import StudentTopbar from "@/src/components/student/StudentTopbar";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  requireStudent(user);
  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr]">
      <aside className="border-r"><StudentSidebar /></aside>
      <section className="flex flex-col">
        <StudentTopbar />
        <main className="p-6">{children}</main>
      </section>
    </div>
  );
}
'

ensure_file "src/app/student/page.tsx" \
'import { redirect } from "next/navigation";
export default function StudentIndex(){ redirect("/student/dashboard"); return null; }
'

ensure_file "src/app/student/(dashboard)/dashboard/page.tsx" \
'export default async function StudentDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">Applications</div><div className="text-2xl font-bold">0</div></div>
        <div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">Saved Jobs</div><div className="text-2xl font-bold">0</div></div>
        <div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">Interviews</div><div className="text-2xl font-bold">0</div></div>
      </div>
    </div>
  );
}
'

ensure_file "src/app/student/jobs/page.tsx" \
'async function getJobs(){
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/jobs`,{ cache: "no-store" });
  if(!res.ok) return [];
  return res.json();
}
export default async function JobsPage(){
  const jobs = await getJobs();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Jobs</h1>
      <div className="grid gap-4">
        {jobs.map((job:any)=>(
          <a key={job.id} href={`/student/jobs/${job.id}`} className="rounded-lg border p-4 hover:bg-muted/30">
            <div className="font-medium">{job.title}</div>
            <div className="text-sm text-muted-foreground">{job.organization?.name} • {job.location}</div>
          </a>
        ))}
      </div>
    </div>
  );
}
'

ensure_file "src/app/student/jobs/[id]/page.tsx" \
'import { notFound } from "next/navigation";
async function getJob(id:string){
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/jobs/${id}`,{ cache: "no-store" });
  if(!res.ok) return null;
  return res.json();
}
export default async function JobDetail({ params }:{ params:{ id:string } }){
  const job = await getJob(params.id);
  if(!job) return notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{job.title}</h1>
      <div className="text-sm text-muted-foreground">{job.organization?.name} • {job.location}</div>
      <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: job.descriptionHtml ?? "" }} />
      <form action="/api/student/applications" method="post" className="mt-6">
        <input type="hidden" name="jobId" value={job.id} />
        <button className="rounded-md border px-4 py-2">Apply</button>
        <button formAction="/api/student/saved-jobs" name="jobId" value={job.id} className="ml-3 rounded-md border px-4 py-2">Save</button>
      </form>
    </div>
  );
}
'

ensure_file "src/app/student/applications/page.tsx" \
'export default async function ApplicationsPage(){
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/student/applications`,{ cache:"no-store" });
  const apps = res.ok ? await res.json() : [];
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">My Applications</h1>
      <div className="rounded-lg border divide-y">
        {apps.length===0 && <div className="p-6 text-sm text-muted-foreground">No applications yet.</div>}
        {apps.map((a:any)=>(
          <a key={a.id} href={`/student/applications/${a.id}`} className="flex items-center justify-between p-4 hover:bg-muted/30">
            <div>
              <div className="font-medium">{a.job?.title}</div>
              <div className="text-sm text-muted-foreground">{a.organization?.name} • {a.updatedAt}</div>
            </div>
            <span className="text-xs rounded border px-2 py-1">{a.status ?? "Pending"}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
'

ensure_file "src/app/student/applications/[id]/page.tsx" \
'export default async function ApplicationDetail({ params }:{ params:{ id:string } }){
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/student/applications/${params.id}`,{ cache:"no-store" });
  if(!res.ok) return <div className="text-sm text-red-600">Failed to load application.</div>;
  const app = await res.json();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{app.job?.title}</h1>
      <div className="text-sm text-muted-foreground">{app.organization?.name}</div>
      <div className="rounded-lg border p-4">
        <div className="font-medium mb-2">Status</div>
        <div className="text-sm">{app.status ?? "Pending"}</div>
      </div>
    </div>
  );
}
'

ensure_file "src/app/student/profile/page.tsx" \
'export default async function StudentProfilePage(){
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/student/profile`,{ cache:"no-store" });
  const me = res.ok ? await res.json() : null;
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <form action="/api/student/profile" method="post" className="space-y-4 rounded-lg border p-4">
        <div className="grid gap-2">
          <label className="text-sm">Full name</label>
          <input className="border rounded px-3 py-2" name="name" defaultValue={me?.name ?? ""}/>
        </div>
        <div className="grid gap-2">
          <label className="text-sm">University</label>
          <input className="border rounded px-3 py-2" name="university" defaultValue={me?.university ?? ""}/>
        </div>
        <div className="grid gap-2">
          <label className="text-sm">Phone (PK)</label>
          <input className="border rounded px-3 py-2" name="phone" defaultValue={me?.phone ?? ""}/>
        </div>
        <button className="rounded-md border px-4 py-2">Save</button>
      </form>
    </div>
  );
}
'

ensure_file "src/app/student/settings/page.tsx" \
'export default function StudentSettingsPage(){
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="rounded-lg border p-4 text-sm text-muted-foreground">Notification & privacy preferences coming soon.</div>
    </div>
  );
}
'

# ------------------------------------------------------------------------------
# 2) Shared Components (mirror existing console look)
# ------------------------------------------------------------------------------

ensure_dir "src/components/student"

ensure_file "src/components/student/StudentSidebar.tsx" \
'export default function StudentSidebar(){
  return (
    <nav className="p-4 space-y-1 text-sm">
      <a href="/student/dashboard" className="block rounded px-3 py-2 hover:bg-muted/50">Dashboard</a>
      <a href="/student/jobs" className="block rounded px-3 py-2 hover:bg-muted/50">Jobs</a>
      <a href="/student/applications" className="block rounded px-3 py-2 hover:bg-muted/50">Applications</a>
      <a href="/student/profile" className="block rounded px-3 py-2 hover:bg-muted/50">Profile</a>
      <a href="/student/settings" className="block rounded px-3 py-2 hover:bg-muted/50">Settings</a>
    </nav>
  );
}
'

ensure_file "src/components/student/StudentTopbar.tsx" \
'export default function StudentTopbar(){
  return (
    <div className="border-b p-4 flex items-center justify-between">
      <div className="text-sm text-muted-foreground">Student Portal</div>
      <div className="flex items-center gap-2">
        <input placeholder="Search jobs" className="border rounded px-3 py-2 text-sm" />
      </div>
    </div>
  );
}
'

ensure_file "src/components/student/JobCard.tsx" \
'export default function JobCard({ job }:{ job:any }){
  return (
    <a href={`/student/jobs/${job.id}`} className="rounded-lg border p-4 hover:bg-muted/30">
      <div className="font-medium">{job.title}</div>
      <div className="text-sm text-muted-foreground">{job.organization?.name} • {job.location}</div>
    </a>
  );
}
'

ensure_file "src/components/student/ApplicationRow.tsx" \
'export default function ApplicationRow({ app }:{ app:any }){
  return (
    <a href={`/student/applications/${app.id}`} className="flex items-center justify-between p-4 hover:bg-muted/30">
      <div>
        <div className="font-medium">{app.job?.title}</div>
        <div className="text-sm text-muted-foreground">{app.organization?.name} • {app.updatedAt}</div>
      </div>
      <span className="text-xs rounded border px-2 py-1">{app.status ?? "Pending"}</span>
    </a>
  );
}
'

ensure_file "src/components/student/EmptyState.tsx" \
'export default function EmptyState({ title, subtitle, cta }:{ title:string; subtitle?:string; cta?:JSX.Element }){
  return (
    <div className="rounded-lg border p-8 text-center">
      <div className="text-lg font-medium">{title}</div>
      {subtitle && <div className="text-sm text-muted-foreground mt-1">{subtitle}</div>}
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
'

# ------------------------------------------------------------------------------
# 3) Client hooks (simple, focused)
# ------------------------------------------------------------------------------

ensure_dir "src/hooks"

ensure_file "src/hooks/useStudent.ts" \
'export async function getStudent(){
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/student/profile`,{ cache:"no-store" });
  if(!res.ok) return null;
  return res.json();
}
'

ensure_file "src/hooks/useSavedJobs.ts" \
'export async function getSavedJobs(){
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/student/saved-jobs`,{ cache:"no-store" });
  return res.ok ? res.json() : [];
}
export async function saveJob(jobId:string){
  await fetch(`/api/student/saved-jobs`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ jobId }) });
}
export async function unsaveJob(jobId:string){
  await fetch(`/api/student/saved-jobs?jobId=${encodeURIComponent(jobId)}`, { method:"DELETE" });
}
'

# ------------------------------------------------------------------------------
# 4) Server utilities (auth + RBAC)
# ------------------------------------------------------------------------------

ensure_dir "src/lib"

ensure_file "src/lib/rbac.ts" \
'export function requireStudent(user: { role?: string } | null | undefined){
  if(!user || user.role !== "student"){
    const err = new Error("Forbidden");
    // @ts-ignore
    err.status = 403;
    throw err;
  }
}
'

# (Assumes you already have getCurrentUser in src/lib/auth.ts)

# ------------------------------------------------------------------------------
# 5) Student API endpoints
# ------------------------------------------------------------------------------

ensure_dir "src/app/api/student/profile"
ensure_dir "src/app/api/student/applications"
ensure_dir "src/app/api/student/applications/[id]"
ensure_dir "src/app/api/student/saved-jobs"
ensure_dir "src/app/api/student/resume"

ensure_file "src/app/api/student/profile/route.ts" \
'import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { requireStudent } from "@/src/lib/rbac";
// import { db } from "@/src/lib/db";

export async function GET(){
  const user = await getCurrentUser();
  requireStudent(user);
  // const me = await db.getStudentProfile(user.id);
  const me = { id:user.id, name:user.name ?? "", university:"", phone:"" };
  return NextResponse.json(me);
}

export async function POST(req:Request){
  const user = await getCurrentUser();
  requireStudent(user);
  const form = await req.formData();
  const payload = Object.fromEntries(form.entries());
  // await db.updateStudentProfile(user.id, payload);
  return NextResponse.json({ ok:true });
}
'

ensure_file "src/app/api/student/applications/route.ts" \
'import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { requireStudent } from "@/src/lib/rbac";
// import { db } from "@/src/lib/db";

export async function GET(){
  const user = await getCurrentUser();
  requireStudent(user);
  // const rows = await db.getApplicationsByUser(user.id);
  const rows:any[] = [];
  return NextResponse.json(rows);
}

export async function POST(req:Request){
  const user = await getCurrentUser();
  requireStudent(user);
  const { jobId } = await req.json();
  if(!jobId) return NextResponse.json({ error:"jobId required" }, { status:400 });
  // await db.createApplication({ userId:user.id, jobId });
  return NextResponse.json({ ok:true });
}
'

ensure_file "src/app/api/student/applications/[id]/route.ts" \
'import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { requireStudent } from "@/src/lib/rbac";
// import { db } from "@/src/lib/db";

export async function GET(_:Request,{ params }:{ params:{ id:string } }){
  const user = await getCurrentUser();
  requireStudent(user);
  // const row = await db.getApplicationOwned(user.id, params.id);
  const row = { id: params.id, status:"Pending", job:{ title:"" }, organization:{ name:"" } };
  return NextResponse.json(row);
}

export async function PATCH(req:Request,{ params }:{ params:{ id:string } }){
  const user = await getCurrentUser();
  requireStudent(user);
  const body = await req.json();
  // await db.updateApplicationOwned(user.id, params.id, body);
  return NextResponse.json({ ok:true });
}
'

ensure_file "src/app/api/student/saved-jobs/route.ts" \
'import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { requireStudent } from "@/src/lib/rbac";
// import { db } from "@/src/lib/db";

export async function GET(){
  const user = await getCurrentUser();
  requireStudent(user);
  // const rows = await db.getSavedJobs(user.id);
  const rows:any[] = [];
  return NextResponse.json(rows);
}

export async function POST(req:Request){
  const user = await getCurrentUser();
  requireStudent(user);
  const { jobId } = await req.json();
  if(!jobId) return NextResponse.json({ error:"jobId required" }, { status:400 });
  // await db.saveJob(user.id, jobId);
  return NextResponse.json({ ok:true });
}

export async function DELETE(req:Request){
  const user = await getCurrentUser();
  requireStudent(user);
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get("jobId");
  if(!jobId) return NextResponse.json({ error:"jobId required" }, { status:400 });
  // await db.unsaveJob(user.id, jobId);
  return NextResponse.json({ ok:true });
}
'

ensure_file "src/app/api/student/resume/route.ts" \
'import { NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth";
import { requireStudent } from "@/src/lib/rbac";
// import { putObject, getLatestResume } from "@/src/lib/storage";

export async function GET(){
  const user = await getCurrentUser();
  requireStudent(user);
  // const file = await getLatestResume(user.id);
  return NextResponse.json({ ok:true, url:null });
}

export async function POST(req:Request){
  const user = await getCurrentUser();
  requireStudent(user);
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if(!file) return NextResponse.json({ error:"file required" }, { status:400 });
  // await putObject(`resumes/${user.id}/${Date.now()}-${file.name}`, file);
  return NextResponse.json({ ok:true });
}
'

echo "✅ Student portal scaffold check/creation complete."
