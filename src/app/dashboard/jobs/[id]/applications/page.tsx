"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession, authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Clock, Filter, ListChecks, Briefcase, Search, HelpCircle, UserPlus, LogOut, Bell } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import CommandPalette from "@/components/CommandPalette";
import { useCommandPalette } from "@/hooks/use-command-palette";

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
  const { isOpen: isCommandPaletteOpen, open: openCommandPalette, close: closeCommandPalette } = useCommandPalette();
  const [job, setJob] = useState<Job | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [org, setOrg] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user && params.id) {
      fetchData();
      fetchOrg();
    }
  }, [session, params.id, filter]);

  const fetchOrg = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const orgResp = await fetch("/api/organizations?mine=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (orgResp.ok) {
        const orgs = await orgResp.json();
        if (Array.isArray(orgs) && orgs.length > 0) {
          setOrg(orgs[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch org:", error);
    }
  };

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

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) {
      toast.error(error.code);
    } else {
      localStorage.removeItem("bearer_token");
      router.push("/");
    }
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
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
    <div className="min-h-screen bg-[#FEFEFA] flex">
      {/* Left Sidebar */}
      <aside className="w-64 bg-[#FEFEFA] border-r border-gray-200 flex flex-col h-screen sticky top-0">
        <div className="p-6">
          <div className="text-xl font-display font-bold text-gray-900 mb-6">{org?.name || "forshadow"}</div>
          
          <Button onClick={() => router.push("/dashboard/jobs?create=1")} className="w-full mb-6 bg-[#F5F1E8] text-gray-900 hover:bg-[#E8E0D5] border-0">
            + Create a Job
          </Button>
          
          <nav className="space-y-1">
            <Button variant="ghost" className="w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900" onClick={() => router.push("/dashboard")}>
              <Bell className="w-4 h-4 mr-3" />
              Activities
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-700 bg-[#F5F1E8] text-gray-900" onClick={() => router.push("/dashboard/jobs")}>
              <Briefcase className="w-4 h-4 mr-3" />
              Jobs
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900"
              disabled={!org?.id}
              title={!org?.id ? "Select or create an organization first" : "Assessments"}
              onClick={() =>
                org?.id && router.push(`/dashboard/organizations/${org.id}/assessments`)
              }
            >
              <ListChecks className="w-4 h-4 mr-3" />
              Assessments
            </Button>
          </nav>
        </div>
        
        <div className="mt-auto p-6 border-t border-gray-200">
          <div className="space-y-3">
            <Button 
              variant="ghost" 
              className="w-full justify-start text-gray-500 text-sm"
              onClick={openCommandPalette}
            >
              <Search className="w-4 h-4 mr-3" />
              Search
              <span className="ml-auto text-xs">⌘K</span>
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-500 text-sm">
              <HelpCircle className="w-4 h-4 mr-3" />
              Help & Support
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-500 text-sm">
              <UserPlus className="w-4 h-4 mr-3" />
              Invite people
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-500 text-sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-3" />
              Log out
            </Button>
          </div>
          
          <div className="mt-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white text-sm font-medium">{session.user.name?.charAt(0)}</span>
            </div>
            <div className="text-sm font-medium text-gray-900">{session.user.name}</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto">
        <div className="p-8">
        <div className="max-w-6xl">
          <div className="flex items-center gap-4 mb-8">
            <nav className="flex items-center gap-2 text-sm">
              <Link
                href="/dashboard"
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                Dashboard
              </Link>
              <span className="text-gray-400">&gt;</span>
              <Link
                href="/dashboard/jobs"
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                Jobs
              </Link>
              <span className="text-gray-400">&gt;</span>
              <Link
                href={`/dashboard/jobs/${params.id}`}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                {job.title}
              </Link>
              <span className="text-gray-400">&gt;</span>
              <span className="text-gray-900 font-medium">Applications</span>
            </nav>
          </div>

          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-1">
              {job.title} - Applications
            </h2>
            <p className="text-sm text-gray-500">
              {applications.length} total application{applications.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="w-4 h-4 text-gray-500" />
              {stages.map((stage) => (
                <button
                  key={stage.value}
                  onClick={() => setFilter(stage.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filter === stage.value
                      ? "bg-[#6a994e] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {stage.label} ({stage.count})
                </button>
              ))}
            </div>
          </div>

          {/* Applications List */}
          <div className="bg-white rounded-lg shadow-sm">
            {applications.length === 0 ? (
              <div className="text-center py-12">
                <User className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">
                  No applications found for this filter
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {applications.map((app) => (
                  <Link
                    key={app.id}
                    href={`/dashboard/applications/${app.id}`}
                    className="block p-5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            {app.applicantEmail}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3 text-gray-500" />
                            <span className="text-xs text-gray-500">
                              Applied {new Date(app.createdAt).toLocaleDateString()}
                            </span>
                            {app.source && (
                              <>
                                <span className="text-xs text-gray-500">•</span>
                                <span className="text-xs text-gray-500">
                                  via {app.source}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
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
        </div>
      </main>
      
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={closeCommandPalette}
        orgId={org?.id}
      />
    </div>
  );
}