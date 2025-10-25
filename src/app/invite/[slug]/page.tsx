"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building, User, Mail, Lock, ArrowRight } from "lucide-react";

interface Organization {
  id: number;
  name: string;
  slug: string;
  type: string;
  link?: string;
  benefits?: string;
  about_company?: string;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (params.slug) {
      fetchOrganization();
    }
  }, [params.slug]);

  const fetchOrganization = async () => {
    try {
      const response = await fetch(`/api/organizations/by-slug/${params.slug}`);
      if (response.ok) {
        const data = await response.json();
        setOrg(data);
      } else {
        toast.error("Organization not found");
        router.push("/");
      }
    } catch (error) {
      console.error("Failed to fetch organization:", error);
      toast.error("Failed to load organization");
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setJoining(true);
    try {
      // First, create the user account
      const signupResponse = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
        }),
      });

      if (!signupResponse.ok) {
        const errorData = await signupResponse.json();
        throw new Error(errorData.error || "Failed to create account");
      }

      const signupData = await signupResponse.json();
      
      // Wait a moment for the user to be fully created in the database
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Get the user from our database by email
      const userResponse = await fetch(`/api/users/by-email/${encodeURIComponent(formData.email)}`);
      if (!userResponse.ok) {
        throw new Error("Failed to find created user");
      }
      const userData = await userResponse.json();
      
      // Then, add them to the organization
      const joinResponse = await fetch(`/api/organizations/${org?.id}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: userData.id,
          role: "member",
        }),
      });

      if (!joinResponse.ok) {
        throw new Error("Failed to join organization");
      }

      toast.success("Successfully joined the organization!");
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to join organization:", error);
      toast.error(error instanceof Error ? error.message : "Failed to join organization");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FEFEFA] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#6a994e] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="min-h-screen bg-[#FEFEFA] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Organization not found</h1>
          <Button onClick={() => router.push("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
      {/* Left Side - Organization Info */}
      <div className="flex-1 bg-gradient-to-br from-[#6a994e] to-[#5a8a3e] flex items-center justify-center p-12">
        <div className="text-white max-w-md">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <Building className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{org.name}</h1>
              <p className="text-white/80">Join our team</p>
            </div>
          </div>
          
          {org.about_company && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">About us</h3>
              <p className="text-white/90 leading-relaxed">{org.about_company}</p>
            </div>
          )}
          
          {org.benefits && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Benefits</h3>
              <p className="text-white/90 leading-relaxed">{org.benefits}</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Side - Join Form */}
      <div className="w-96 bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Join {org.name}</h2>
            <p className="text-gray-600">Create your account to get started</p>
          </div>

          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={joining}
              className="w-full bg-[#6a994e] hover:bg-[#5a8a3e] text-white"
            >
              {joining ? "Joining..." : "Join Organization"}
              {!joining && <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <button
                onClick={() => router.push("/login")}
                className="text-[#6a994e] hover:underline"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
