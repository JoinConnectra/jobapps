"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Users, ArrowLeft, TrendingUp } from "lucide-react";
import Link from "next/link";

interface Job {
  id: number;
  title: string;
  dept: string | null;
  status: string;
  createdAt: string;
}

interface Organization {
  id: number;
  name: string;
  slug: string;
  type: string;
  plan: string | null;
  seatLimit: number | null;
}

export default function OrganizationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, isPending } = useSession();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user && params.id) {
      fetchData();
    }
  }, [session, params.id]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      
      // Fetch organization
      const orgResponse = await fetch(`/api/organizations/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (orgResponse.ok) {
        const orgData = await orgResponse.json();
        setOrganization(orgData);
      }

      // Fetch jobs
      const jobsResponse = await fetch(`/api/jobs?orgId=${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json();
        setJobs(jobsData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session?.user || !organization) return null;

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <nav className="bg-white border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Link
            href="/dashboard/organizations"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Organizations
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Organization Header */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-4xl font-display font-bold text-foreground mb-2">
                  {organization.name}
                </h1>
                <p className="text-muted-foreground">/{organization.slug}</p>
              </div>
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                {organization.type}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Briefcase className="w-6 h-6 text-primary mb-2" />
                <div className="text-2xl font-bold text-foreground">{jobs.length}</div>
                <div className="text-sm text-muted-foreground">Active Jobs</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <Users className="w-6 h-6 text-accent mb-2" />
                <div className="text-2xl font-bold text-foreground">
                  {organization.seatLimit || "∞"}
                </div>
                <div className="text-sm text-muted-foreground">Seat Limit</div>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <TrendingUp className="w-6 h-6 text-secondary mb-2" />
                <div className="text-2xl font-bold text-foreground">0</div>
                <div className="text-sm text-muted-foreground">Total Applications</div>
              </div>
            </div>
          </div>

          {/* Jobs Section */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-display font-bold text-foreground">
                Job Postings
              </h2>
              <Link href={`/dashboard/organizations/${params.id}/jobs/new`}>
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Job
                </Button>
              </Link>
            </div>

            {jobs.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No jobs posted yet</p>
                <Link href={`/dashboard/organizations/${params.id}/jobs/new`}>
                  <Button>Post Your First Job</Button>
                </Link>
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
                    <p className="text-xs text-muted-foreground mt-2">
                      Created {new Date(job.createdAt).toLocaleDateString()}
                    </p>
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
