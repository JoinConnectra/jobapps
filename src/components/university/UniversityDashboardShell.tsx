"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession, authClient } from "@/lib/auth-client";
import {
  Bell,
  Building2,
  Users2,
  Search,
  HelpCircle,
  UserPlus,
  LogOut,
  Settings,
  Calendar,
  GraduationCap,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function UniversityDashboardShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const [org, setOrg] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch("/api/organizations?mine=true");
        if (resp.ok) {
          const orgs = await resp.json();
          const uni = Array.isArray(orgs)
            ? orgs.find((o: any) => o.type === "university")
            : null;
          if (uni) setOrg(uni);
        }
      } catch {
        // no-op
      }
    })();
  }, []);

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) toast.error(error.code);
    else {
      localStorage.removeItem("bearer_token");
      router.push("/");
    }
  };

  const isActive = (href: string) => {
    if (!pathname) return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#FEFEFA] border-r border-gray-200 flex flex-col h-screen sticky top-0">
        <div className="p-6">
          <div className="text-xl font-display font-bold text-gray-900 mb-6">
            {org?.name || "Your University"}
          </div>

          <nav className="space-y-1">
            {/* Overview */}
            <Button
              variant="ghost"
              className={`w-full justify-start text-gray-700 ${
                isActive("/university/dashboard")
                  ? "bg-[#F5F1E8] text-gray-900"
                  : "hover:bg-[#F5F1E8] hover:text-gray-900"
              }`}
              onClick={() => router.push("/university/dashboard")}
            >
              <Bell className="w-4 h-4 mr-3" /> Overview
            </Button>

            {/* Partner Requests */}
            <Button
              variant="ghost"
              className={`w-full justify-start text-gray-700 ${
                isActive("/university/dashboard/requests")
                  ? "bg-[#F5F1E8] text-gray-900"
                  : "hover:bg-[#F5F1E8] hover:text-gray-900"
              }`}
              onClick={() => router.push("/university/dashboard/requests")}
            >
              <Users2 className="w-4 h-4 mr-3" /> Partner Companies
            </Button>

            {/* Applications */}
            <Button
              variant="ghost"
              className={`w-full justify-start text-gray-700 ${
                isActive("/university/dashboard/applications")
                  ? "bg-[#F5F1E8] text-gray-900"
                  : "hover:bg-[#F5F1E8] hover:text-gray-900"
              }`}
              onClick={() => router.push("/university/dashboard/applications")}
            >
              <Users2 className="w-4 h-4 mr-3" /> Applications
            </Button>

            {/* Students */}
            <Button
              variant="ghost"
              className={`w-full justify-start text-gray-700 ${
                isActive("/university/dashboard/students")
                  ? "bg-[#F5F1E8] text-gray-900"
                  : "hover:bg-[#F5F1E8] hover:text-gray-900"
              }`}
              onClick={() => router.push("/university/dashboard/students")}
            >
              <GraduationCap className="w-4 h-4 mr-3" /> Students
            </Button>

            {/* Jobs */}
            <Button
              variant="ghost"
              className={`w-full justify-start text-gray-700 ${
                isActive("/university/dashboard/jobs")
                  ? "bg-[#F5F1E8] text-gray-900"
                  : "hover:bg-[#F5F1E8] hover:text-gray-900"
              }`}
              onClick={() => router.push("/university/dashboard/jobs")}
            >
              <Briefcase className="w-4 h-4 mr-3" /> Jobs
            </Button>

            

            

            {/* Approved Companies 
            <Button
              variant="ghost"
              className={`w-full justify-start text-gray-700 ${
                isActive("/university/dashboard/partners")
                  ? "bg-[#F5F1E8] text-gray-900"
                  : "hover:bg-[#F5F1E8] hover:text-gray-900"
              }`}
              onClick={() => router.push("/university/dashboard/partners")}
            >
              <Building2 className="w-4 h-4 mr-3" /> Approved Companies
            </Button>
            */}

            {/* Events */}
            <Button
              variant="ghost"
              className={`w-full justify-start text-gray-700 ${
                isActive("/university/dashboard/events")
                  ? "bg-[#F5F1E8] text-gray-900"
                  : "hover:bg-[#F5F1E8] hover:text-gray-900"
              }`}
              onClick={() => router.push("/university/dashboard/events")}
            >
              <Calendar className="w-4 h-4 mr-3" /> Events
            </Button>

            {/* KPI & Analytics */}
            <Button
              variant="ghost"
              className={`w-full justify-start text-gray-700 ${
                isActive("/university/dashboard/kpi")
                  ? "bg-[#F5F1E8] text-gray-900"
                  : "hover:bg-[#F5F1E8] hover:text-gray-900"
              }`}
              onClick={() => router.push("/university/dashboard/kpi")}
            >
              <Calendar className="w-4 h-4 mr-3" /> KPI & Analytics
            </Button>
          </nav>
        </div>

        {/* FOOTER */}
        <div className="mt-auto p-6 border-t border-gray-200">
          <div className="space-y-3">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-500 text-sm"
            >
              <Search className="w-4 h-4 mr-3" /> Search{" "}
              <span className="ml-auto text-xs">⌘K</span>
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-500 text-sm"
            >
              <HelpCircle className="w-4 h-4 mr-3" /> Help & Support
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-500 text-sm"
            >
              <UserPlus className="w-4 h-4 mr-3" /> Invite People
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start text-gray-500 text-sm"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-3" /> Log Out
            </Button>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto">
        <div className="p-8 max-w-6xl mx-auto">
          <h1 className="text-2xl font-semibold mb-4">{title}</h1>
          {children}
        </div>
      </main>
    </div>
  );
}
