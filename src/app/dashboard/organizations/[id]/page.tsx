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
      // Redirect to Jobs page to avoid org management surface for company tenants
      router.replace("/dashboard/jobs");
    }
  }, [session, params.id, router]);

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
    <div className="min-h-screen bg-[#F5F1E8]" />
  );
}
