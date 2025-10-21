"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Clock, Filter } from "lucide-react";
import Link from "next/link";

interface Application {
  id: number;
  applicantEmail: string;
  stage: string;
  source: string | null;
  createdAt: string;
  jobTitle: string;
}

interface Job {
  id: number;
  title: string;
}

export default function JobApplicationsPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, isPending } = useSession();
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user && params.id) {
      fetchData();
    }
  }, [session, params.id, filter]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("bearer_token");

      // Fetch job
      const jobResponse = await fetch(`/api/jobs?id=${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (jobResponse.ok) {
        const jobData = await jobResponse.json();
        setJob(jobData);
      }

      // Fetch applications
      const appsUrl = filter === "all" 
        ? `/api/applications?jobId=${params.id}`
        : `/api/applications?jobId=${params.id}&stage=${filter}`;
        
      const appsResponse = await fetch(appsUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (appsResponse.ok) {
        const appsData = await appsResponse.json();
        setApplications(appsData);
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

  if (!session?.user || !job) return null;

  const stages = [
    { value: "all", label: "All", count: applications.length },
    { value: "applied", label: "Applied", count: applications.filter(a => a.stage === "applied").length },
    { value: "reviewing", label: "Reviewing", count: applications.filter(a => a.stage === "reviewing").length },
    { value: "phone_screen", label: "Phone Screen", count: applications.filter(a => a.stage === "phone_screen").length },
    { value: "onsite", label: "Onsite", count: applications.filter(a => a.stage === "onsite").length },
    { value: "offer", label: "Offer", count: applications.filter(a => a.stage === "offer").length },
    { value: "hired", label: "Hired", count: applications.filter(a => a.stage === "hired").length },
    { value: "rejected", label: "Rejected", count: applications.filter(a => a.stage === "rejected").length },
  ];

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <nav className="bg-white border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Link
            href={`/dashboard/jobs/${params.id}`}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Job
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <h1 className="text-3xl font-display font-bold text-foreground mb-2">
              {job.title} - Applications
            </h1>
            <p className="text-muted-foreground">
              {applications.length} total application{applications.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-muted-foreground" />
              {stages.map((stage) => (
                <button
                  key={stage.value}
                  onClick={() => setFilter(stage.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filter === stage.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {stage.label} ({stage.count})
                </button>
              ))}
            </div>
          </div>

          {/* Applications List */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {applications.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No applications found for this filter
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <Link
                    key={app.id}
                    href={`/dashboard/applications/${app.id}`}
                    className="block p-4 border border-border rounded-lg hover:border-primary hover:bg-blue-50/50 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            {app.applicantEmail}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              Applied {new Date(app.createdAt).toLocaleDateString()}
                            </span>
                            {app.source && (
                              <>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">
                                  via {app.source}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          app.stage === "hired"
                            ? "bg-green-100 text-green-700"
                            : app.stage === "rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {app.stage}
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
