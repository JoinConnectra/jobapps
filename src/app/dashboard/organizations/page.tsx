"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Building2, GraduationCap, Users, Settings } from "lucide-react";
import Link from "next/link";

interface Organization {
  id: number;
  name: string;
  slug: string;
  type: "company" | "university";
  plan: string | null;
  seatLimit: number | null;
  createdAt: string;
}

export default function OrganizationsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user) {
      // Redirect company users away from org management; use Jobs instead
      router.replace("/dashboard/jobs");
    }
  }, [session, router]);

  const fetchOrganizations = async () => {
    setLoading(false);
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
    <div className="min-h-screen bg-[#FEFEFA]">
      {/* Redirected to Jobs */}
    </div>
  );
}
