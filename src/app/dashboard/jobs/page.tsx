"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, Plus, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import Link from "next/link";

interface Job {
  id: number;
  title: string;
  dept: string | null;
  status: string;
  orgId: number;
  createdAt: string;
}

export default function AllJobsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<number | null>(null);

  // job creation state
  const [creating, setCreating] = useState(false);
  const [generatingJD, setGeneratingJD] = useState(false);
  const [form, setForm] = useState({
    title: "",
    dept: "",
    locationMode: "remote",
    salaryRange: "",
    descriptionMd: "",
    status: "draft" as "draft" | "published" | "closed",
    visibility: "public" as "public" | "institutions" | "both",
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user) {
      fetchJobs();
    }
  }, [session]);

  const fetchJobs = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      // Fetch my org(s) first and then scope jobs by orgId
      const orgResp = await fetch("/api/organizations?mine=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      let orgIdParam = "";
      if (orgResp.ok) {
        const orgs = await orgResp.json();
        if (Array.isArray(orgs) && orgs.length > 0) {
          setOrgId(orgs[0].id);
          orgIdParam = `&orgId=${orgs[0].id}`;
        }
      }

      const response = await fetch(`/api/jobs?limit=100${orgIdParam}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(data);
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateJD = async () => {
    if (!orgId) return toast.error("No organization found");
    if (!form.title) return toast.error("Enter a job title first");
    setGeneratingJD(true);
    try {
      const token = localStorage.getItem("bearer_token");
      const createResp = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orgId, title: form.title, dept: form.dept, locationMode: form.locationMode, salaryRange: form.salaryRange, status: "draft" }),
      });
      if (!createResp.ok) throw new Error();
      const job = await createResp.json();
      const prompt = `Create a comprehensive job description for a ${form.title} position${form.dept ? ` in the ${form.dept} department` : ""}. Location: ${form.locationMode}${form.salaryRange ? `. Salary: ${form.salaryRange}` : ""}. Make it suitable for the Pakistan job market with both English and Urdu context.`;
      const jdResp = await fetch("/api/ai/generate-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ jobId: job.id, prompt }),
      });
      if (jdResp.ok) {
        const jd = await jdResp.json();
        setForm((p) => ({ ...p, descriptionMd: jd.contentMd }));
        toast.success("Generated description");
      }
    } catch {
      toast.error("Failed to generate description");
    } finally {
      setGeneratingJD(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId) return toast.error("No organization found");
    setCreating(true);
    try {
      const token = localStorage.getItem("bearer_token");
      const resp = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orgId, ...form }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || "Failed to create job");
      toast.success("Job created");
      router.push(`/dashboard/jobs/${data.id}`);
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setCreating(false);
    }
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session?.user) return null;

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <nav className="bg-white border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-display font-bold text-foreground">
            All Jobs
          </h1>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {searchParams?.get("create") === "1" && (
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-display font-bold text-foreground">Create a Job</h2>
              </div>
              <form onSubmit={handleCreate} className="space-y-6">
                <div>
                  <Label htmlFor="title">Job Title *</Label>
                  <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Senior Software Engineer" required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dept">Department</Label>
                    <Input id="dept" value={form.dept} onChange={(e) => setForm({ ...form, dept: e.target.value })} placeholder="e.g., Engineering" />
                  </div>
                  <div>
                    <Label htmlFor="locationMode">Location Mode</Label>
                    <Select value={form.locationMode} onValueChange={(v) => setForm({ ...form, locationMode: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                        <SelectItem value="onsite">On-site</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="salaryRange">Salary Range</Label>
                  <Input id="salaryRange" value={form.salaryRange} onChange={(e) => setForm({ ...form, salaryRange: e.target.value })} placeholder="e.g., PKR 150,000 - 250,000/month" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label htmlFor="descriptionMd">Job Description</Label>
                    <Button type="button" variant="outline" size="sm" onClick={handleGenerateJD} disabled={generatingJD || !form.title} className="gap-2">
                      {generatingJD ? (<><Loader2 className="w-4 h-4 animate-spin" />Generating...</>) : (<><Sparkles className="w-4 h-4" />Generate with AI</>)}
                    </Button>
                  </div>
                  <Textarea id="descriptionMd" value={form.descriptionMd} onChange={(e) => setForm({ ...form, descriptionMd: e.target.value })} rows={10} className="font-mono text-sm" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="visibility">Visibility</Label>
                    <Select value={form.visibility} onValueChange={(v) => setForm({ ...form, visibility: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Public</SelectItem>
                        <SelectItem value="institutions">Selected Institutions Only</SelectItem>
                        <SelectItem value="both">Institutions + Public</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={creating} className="gap-2">
                    {creating ? (<><Loader2 className="w-4 h-4 animate-spin" />Creating...</>) : (<><Plus className="w-4 h-4" />Create Job</>)}
                  </Button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-lg p-8">
            {jobs.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No jobs found</p>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/dashboard/jobs/${job.id}`}
                    className="block p-4 border border-border rounded-lg hover:border-primary hover:bg-blue-50/50 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-1">
                          {job.title}
                        </h3>
                        {job.dept && (
                          <p className="text-sm text-muted-foreground">{job.dept}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Created {new Date(job.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          job.status === "published"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
