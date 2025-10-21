"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Briefcase } from "lucide-react";
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
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

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
      const response = await fetch("/api/jobs?limit=100", {
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
