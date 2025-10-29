"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Building, User, Mail, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface InviteDetails {
  id: string;
  token: string;
  email: string | null;
  role: string;
  expiresAt: string;
  orgId: number;
  orgName: string;
  orgSlug: string;
  orgType: string;
}

export default function InviteRegistrationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (token) {
      validateInvite(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const validateInvite = async (inviteToken: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/invite/validate?token=${inviteToken}`);
      if (!res.ok) {
        setInvite(null);
        return;
      }
      const data = await res.json();
      setInvite(data);
      if (data.email) {
        setFormData((prev) => ({ ...prev, email: data.email ?? "" }));
      }
    } catch (error) {
      console.error("Failed to validate invite:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: "name" | "email" | "password" | "confirmPassword") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!invite || !token) {
      toast.error("Invite link is invalid or has expired.");
      return;
    }

    if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
      toast.error("Please fill out all fields.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);
    let alreadySignedIn = false;

    try {
      const signUpResult = await authClient.signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.name,
      });

      if (signUpResult?.error) {
        if (signUpResult.error.code === "USER_ALREADY_EXISTS") {
          const loginAttempt = await authClient.signIn.email({
            email: formData.email,
            password: formData.password,
          });

          if (loginAttempt?.error) {
            toast.error("Account already exists. Please verify your password or reset it.");
            setSubmitting(false);
            return;
          }

          alreadySignedIn = true;
        } else {
          toast.error(signUpResult.error.message ?? "Failed to create account.");
          setSubmitting(false);
          return;
        }
      }

      const acceptResponse = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: formData.name,
          email: formData.email,
        }),
      });

      if (!acceptResponse.ok) {
        const errorBody = await acceptResponse.json().catch(() => null);
        throw new Error(errorBody?.error || "Failed to accept invite.");
      }

      if (!alreadySignedIn) {
        const signInResult = await authClient.signIn.email({
          email: formData.email,
          password: formData.password,
        });

        if (signInResult?.error) {
          toast.success("Account created. Please sign in to continue.");
          router.push("/login?registered=true");
          return;
        }
      }

      toast.success("You're all set! Redirecting to your dashboard.");
      router.push("/dashboard");
    } catch (error) {
      console.error("Invite acceptance failed:", error);
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FEFEFA] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto h-9 w-9 rounded-full border-4 border-[#6a994e] border-t-transparent animate-spin" />
          <p className="text-sm text-gray-600">Checking invite...</p>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen bg-[#FEFEFA] flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold text-gray-900">Invite not found</h1>
          <p className="text-sm text-gray-600">This invite link is no longer valid. Please ask your admin to send a new one.</p>
          <Button onClick={() => router.push("/")}>Go to homepage</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
      <div className="flex-1 bg-gradient-to-br from-[#6a994e] to-[#5a8a3e] flex items-center justify-center p-12">
        <div className="text-white max-w-md space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
              <Building className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">{invite.orgName}</h1>
              <p className="text-white/80">Join the team</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-white/85">
            <p>You have been invited to collaborate on the {invite.orgName} employer workspace.</p>
            <p>Complete your account to access jobs, talent pipelines, assessments, and more.</p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md bg-white flex items-center justify-center p-8">
        <div className="w-full space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold text-gray-900">Create your account</h2>
            <p className="text-sm text-gray-600">You'll join {invite.orgName} as a {invite.role}.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full name</Label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={handleChange("name")}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Work email</Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={handleChange("email")}
                  className="pl-10"
                  required
                  readOnly={Boolean(invite.email)}
                />
              </div>
              {invite.email && (
                <p className="mt-1 text-xs text-gray-500">Invite is restricted to {invite.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a secure password"
                  value={formData.password}
                  onChange={handleChange("password")}
                  className="pl-10"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#6a994e]"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={formData.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  className="pl-10"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-[#6a994e]"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#6a994e] hover:bg-[#5a8a3e] text-white"
            >
              {submitting ? "Creating your account..." : "Join company"}
              {!submitting && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-500">
            Already have an account? <button onClick={() => router.push("/login")} className="text-[#6a994e] hover:underline">Sign in</button>
          </p>
        </div>
      </div>
    </div>
  );
}

