"use client";

import { useEffect, useState } from "react";
import { useSession, authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({
    jobs: 0,
    applications: 0,
    organizations: 0,
  });

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user) {
      fetchStats();
    }
  }, [session]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      
      // Fetch organizations
      const orgsResponse = await fetch("/api/organizations", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (orgsResponse.ok) {
        const orgs = await orgsResponse.json();
        setStats(prev => ({ ...prev, organizations: orgs.length }));
      }

      // Fetch jobs (we'll need to implement this properly later)
      // For now just showing 0s
    } catch (error) {
      console.error("Failed to fetch stats:", error);
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

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <nav className="bg-white border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-2xl font-display font-bold text-foreground">
            Rapha
          </Link>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{session.user.name}</p>
              <p className="text-xs text-muted-foreground">{session.user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-all font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <h2 className="text-3xl font-display font-bold text-foreground mb-4">
              Welcome back, {session.user.name}! 👋
            </h2>
            <p className="text-muted-foreground mb-6">
              Your Pakistan-focused hiring platform is ready. Let's build something amazing together.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-primary mb-1">{stats.jobs}</div>
                <div className="text-sm text-muted-foreground">Active Jobs</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-accent mb-1">{stats.applications}</div>
                <div className="text-sm text-muted-foreground">Applications</div>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="text-2xl font-bold text-secondary mb-1">{stats.organizations}</div>
                <div className="text-sm text-muted-foreground">Organizations</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h3 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/dashboard/organizations" className="p-6 border-2 border-border rounded-xl hover:border-primary hover:bg-blue-50 transition-all text-left">
                <div className="text-lg font-semibold text-foreground mb-2">Manage Organizations</div>
                <p className="text-sm text-muted-foreground">View and manage your companies or university profiles</p>
              </Link>
              <Link href="/dashboard/jobs" className="p-6 border-2 border-border rounded-xl hover:border-primary hover:bg-blue-50 transition-all text-left">
                <div className="text-lg font-semibold text-foreground mb-2">View All Jobs</div>
                <p className="text-sm text-muted-foreground">See all job postings across organizations</p>
              </Link>
              <Link href="/dashboard/candidates" className="p-6 border-2 border-border rounded-xl hover:border-primary hover:bg-blue-50 transition-all text-left">
                <div className="text-lg font-semibold text-foreground mb-2">Browse Candidates</div>
                <p className="text-sm text-muted-foreground">View all applications and candidate profiles</p>
              </Link>
              <Link href="/dashboard/analytics" className="p-6 border-2 border-border rounded-xl hover:border-primary hover:bg-blue-50 transition-all text-left">
                <div className="text-lg font-semibold text-foreground mb-2">View Analytics</div>
                <p className="text-sm text-muted-foreground">Track pipeline metrics and hiring performance</p>
              </Link>
            </div>
          </div>

          <div className="mt-8 bg-gradient-to-r from-primary to-accent rounded-2xl shadow-lg p-8 text-white">
            <h3 className="text-2xl font-display font-bold mb-3">🚀 Platform Features</h3>
            <ul className="space-y-2 text-sm">
              <li>✅ Multi-tenant organizations with role-based access control</li>
              <li>✅ AI-powered job description generation</li>
              <li>✅ Voice answer submissions from candidates</li>
              <li>✅ Automatic transcription and AI summaries</li>
              <li>✅ Collaborative review with inline comments</li>
              <li>✅ University portals for student recruitment</li>
              <li>✅ Urdu/English multi-language support</li>
              <li>✅ Activity timeline and audit logs</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}