"use client";

/**
 * AssessmentsPage
 * ----------------
 * This page displays a list of dummy "Assessments" for an organization inside the employer dashboard.
 * It follows the same layout and styling as the Jobs and Activities pages.
 *
 * Key features:
 * - Verifies user session and redirects to /login if unauthenticated.
 * - Fetches the user's primary organization (to show its name in the sidebar).
 * - Displays dummy assessments in a grid (hardcoded for now).
 * - Includes a consistent sidebar with navigation and sign-out options.
 * - Uses CommandPalette for quick actions.
 *
 * Location: /dashboard/organizations/[id]/assessments
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ListChecks,
  Bell,
  Briefcase,
  Search,
  HelpCircle,
  UserPlus,
  LogOut,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession, authClient } from "@/lib/auth-client";
import CommandPalette from "@/components/CommandPalette";
import { useCommandPalette } from "@/hooks/use-command-palette";

/** 
 * Type definition for an assessment
 * Each assessment has an ID, title, type, duration, and status.
 */
type Assessment = {
  id: string;
  title: string;
  type: "MCQ" | "Coding" | "Case Study";
  duration: string;
  status: "Draft" | "Published";
};

/**
 * Temporary dummy data until assessments are stored/fetched from API.
 */
const DUMMY: Assessment[] = [
  { id: "a1", title: "General Aptitude v1", type: "MCQ", duration: "20 min", status: "Draft" },
  { id: "a2", title: "Frontend Coding Warmup", type: "Coding", duration: "45 min", status: "Published" },
  { id: "a3", title: "Product Sense Screen", type: "Case Study", duration: "30 min", status: "Draft" },
];

export default function AssessmentsPage() {
  const { data: session, isPending } = useSession(); // Fetch current user session
  const router = useRouter();
  const { isOpen: isCommandPaletteOpen, open: openCommandPalette, close: closeCommandPalette } =
    useCommandPalette();

  const [org, setOrg] = useState<{ id: number; name: string } | null>(null); // current organization
  const [loading, setLoading] = useState(true); // loading flag for org data

  /**
   * Redirects unauthenticated users to /login
   */
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  /**
   * Once user session is available, fetch the user's organization
   */
  useEffect(() => {
    if (session?.user) {
      fetchOrg();
    }
  }, [session]);

  /**
   * Fetch the user's primary organization (for sidebar display)
   */
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
    } catch (e) {
      console.error("Failed to fetch org:", e);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles user sign-out and redirect to home page
   */
  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) return;
    localStorage.removeItem("bearer_token");
    router.push("/");
  };

  /**
   * Loading spinner shown while checking session or fetching org
   */
  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.user) return null;

  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
      {/* ------------------------------------------------------------------
          LEFT SIDEBAR
          Displays organization name, navigation tabs (Activities, Jobs, Assessments),
          and utility actions like Search, Help, Invite, and Log Out.
      ------------------------------------------------------------------ */}
      <aside className="w-64 bg-[#FEFEFA] border-r border-gray-200 flex flex-col h-screen sticky top-0">
        <div className="p-6">
          {/* Organization name */}
          <div className="text-xl font-display font-bold text-gray-900 mb-6">
            {org?.name || "forshadow"}
          </div>

          {/* Shortcut: create new job */}
          <Button
            onClick={() => router.push("/dashboard/jobs?create=1")}
            className="w-full mb-6 bg-[#F5F1E8] text-gray-900 hover:bg-[#E8E0D5] border-0"
          >
            + Create a Job
          </Button>

          {/* Sidebar navigation */}
          <nav className="space-y-1">
            {/* Activities tab */}
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900"
              onClick={() => router.push("/dashboard")}
            >
              <Bell className="w-4 h-4 mr-3" />
              Activities
            </Button>

            {/* Jobs tab */}
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900"
              onClick={() => router.push("/dashboard/jobs")}
            >
              <Briefcase className="w-4 h-4 mr-3" />
              Jobs
            </Button>

            {/* Current page: Assessments */}
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 bg-[#F5F1E8] text-gray-900"
            >
              <ListChecks className="w-4 h-4 mr-3" />
              Assessments
            </Button>
          </nav>
        </div>

        {/* Bottom section with utility buttons */}
        <div className="mt-auto p-6 border-t border-gray-200">
          <div className="space-y-3">
            {/* Command palette shortcut */}
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-500 text-sm"
              onClick={openCommandPalette}
            >
              <Search className="w-4 h-4 mr-3" />
              Search
              <span className="ml-auto text-xs">⌘K</span>
            </Button>

            {/* Other sidebar actions */}
            <Button variant="ghost" className="w-full justify-start text-gray-500 text-sm">
              <HelpCircle className="w-4 h-4 mr-3" />
              Help & Support
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-500 text-sm">
              <UserPlus className="w-4 h-4 mr-3" />
              Invite people
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-500 text-sm"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-3" />
              Log out
            </Button>
          </div>

          {/* User profile summary at bottom */}
          <div className="mt-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {session.user.name?.charAt(0)}
              </span>
            </div>
            <div className="text-sm font-medium text-gray-900">
              {session.user.name}
            </div>
          </div>
        </div>
      </aside>

      {/* ------------------------------------------------------------------
          MAIN CONTENT AREA
          Displays breadcrumbs, header, and list of dummy assessments.
      ------------------------------------------------------------------ */}
      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto">
        <div className="p-8">
          <div className="max-w-6xl">

            {/* Breadcrumb navigation */}
            <div className="flex items-center gap-4 mb-8">
              <nav className="flex items-center gap-2 text-sm">
                <Link
                  href="/dashboard"
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Dashboard
                </Link>
                <span className="text-gray-400">&gt;</span>
                <span className="text-gray-900 font-medium">Assessments</span>
              </nav>
            </div>

            {/* Page header and action */}
            <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Assessments</h2>
                  <p className="text-sm text-gray-500">
                    Manage screening tests for your openings
                  </p>
                </div>
                {/* Add new assessment (disabled placeholder) */}
                <Button disabled title="Coming soon">
                  + New Assessment
                </Button>
              </div>
            </div>

            {/* Dummy assessment list */}
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {DUMMY.map((a) => (
                <div key={a.id} className="bg-white rounded-lg shadow-sm p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{a.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {a.type} • {a.duration}
                      </p>
                    </div>
                    {/* Status badge */}
                    <span
                      className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                        a.status === "Published"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {a.status}
                    </span>
                  </div>

                  {/* View button placeholder */}
                  <div className="mt-4">
                    <Button variant="outline" size="sm" className="text-xs" disabled>
                      View (dummy)
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Command palette overlay */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        orgId={org?.id}
      />
    </div>
  );
}
