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
      fetchOrganizations();
    }
  }, [session]);

  const fetchOrganizations = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/organizations`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data);
      }
    } catch (error) {
      console.error("Failed to fetch organizations:", error);
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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-2xl font-display font-bold text-foreground">
            Dashboard
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{session.user.email}</span>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-display font-bold text-foreground mb-2">
                Organizations
              </h1>
              <p className="text-muted-foreground">
                Manage your companies and university partnerships
              </p>
            </div>
            <Link href="/dashboard/organizations/new">
              <Button size="lg" className="gap-2">
                <Plus className="w-5 h-5" />
                New Organization
              </Button>
            </Link>
          </div>

          {organizations.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
              <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-foreground mb-2">
                No organizations yet
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Create your first organization to start posting jobs and reviewing applicants
              </p>
              <Link href="/dashboard/organizations/new">
                <Button size="lg" className="gap-2">
                  <Plus className="w-5 h-5" />
                  Create Organization
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {organizations.map((org) => (
                <Link
                  key={org.id}
                  href={`/dashboard/organizations/${org.id}`}
                  className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all border-2 border-transparent hover:border-primary"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      {org.type === "university" ? (
                        <GraduationCap className="w-6 h-6 text-primary" />
                      ) : (
                        <Building2 className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <span className="text-xs px-2 py-1 bg-accent/10 text-accent rounded-full">
                      {org.type}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-semibold text-foreground mb-1">
                    {org.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    /{org.slug}
                  </p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{org.seatLimit || "∞"} seats</span>
                    </div>
                    <Settings className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
