"use client";

/**
 * OrganizationDetailPage
 * ----------------------
 * Purpose:
 * - This route lives at /dashboard/organizations/[id]
 * - Current behavior is to immediately redirect org members to /dashboard/jobs
 *   to avoid exposing an org-management surface for company tenants.
 *
 * What it does:
 * - Auth gate: if not logged in, push to /login.
 * - If session is present and a route param :id exists, `router.replace("/dashboard/jobs")`.
 * - Contains a `fetchData` helper (not invoked in current flow) that can fetch the
 *   organization and its jobs if/when you decide to show an org overview here.
 *
 * Notes for future work:
 * - If you later want this page to render an org summary, call `fetchData()` in an
 *   effect (and remove/adjust the redirect). Right now the redirect happens before
 *   any data fetch runs.
 */

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Plus, Briefcase, Users, ArrowLeft, TrendingUp } from "lucide-react";
import Link from "next/link";

/** Minimal job shape for an org jobs listing (if ever rendered here) */
interface Job {
  id: number;
  title: string;
  dept: string | null;
  status: string;
  createdAt: string;
}

/** Organization metadata for the header/overview (if rendered here) */
interface Organization {
  id: number;
  name: string;
  slug: string;
  type: string;
  plan: string | null;
  seatLimit: number | null;
}

export default function OrganizationDetailPage() {
  // ----- Routing & session -----
  const router = useRouter();
  const params = useParams();
  const { data: session, isPending } = useSession();

  // ----- Local state (used only if you render an org overview here) -----
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  /**
   * Auth guard:
   * - While session status is pending, do nothing.
   * - If user is not logged in once pending is false, send to /login.
   */
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  /**
   * Current redirect behavior for company tenants:
   * - If user is logged in and we have an org id, skip this page's UI and
   *   route straight to the Jobs surface.
   *
   * If you want to render the org details here instead, remove/alter this redirect
   * and call `fetchData()` instead.
   */
  useEffect(() => {
    if (session?.user && params.id) {
      // Redirect to Jobs page to avoid org management surface for company tenants
      router.replace("/dashboard/jobs");
      // If you later remove the redirect, you likely want:
      // fetchData();
    }
  }, [session, params.id, router]);

  /**
   * fetchData:
   * - Helper to load organization summary and its jobs in parallel.
   * - Not invoked in current flow due to the redirect above.
   * - Safe to call from an effect if you choose to render this page.
   */
  const fetchData = async () => {
    try {
      const token = localStorage.getItem("bearer_token");

      // Fetch organization by id
      const orgResponse = await fetch(`/api/organizations/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (orgResponse.ok) {
        const orgData = await orgResponse.json();
        setOrganization(orgData);
      }

      // Fetch jobs scoped to the same org
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

  // ----- Loading / empty states -----
  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If you keep the redirect, we rarely get here with real data.
  if (!session?.user || !organization) return null;

  /**
   * Placeholder return:
   * - This renders a blank page while keeping a valid component return.
   * - Replace with your org overview UI if you stop redirecting.
   */
  return <div className="min-h-screen bg-[#F5F1E8]" />;
}
