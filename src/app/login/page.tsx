"use client";

import { Suspense, useState, useEffect, useMemo, useCallback } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { getDashboardUrl } from "@/lib/auth-redirect";
import Image from "next/image";

/** Helper: fetch accountType for an email (or current session if email omitted) */
async function fetchAccountType(
  email?: string | null
): Promise<"applicant" | "employer" | "university" | null> {
  try {
    const res = await fetch("/api/auth/get-user", {
      method: email ? "POST" : "GET",
      headers: { "Content-Type": "application/json" },
      body: email ? JSON.stringify({ email }) : undefined,
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.accountType as "applicant" | "employer" | "university") ?? null;
  } catch {
    return null;
  }
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();

  const next = useMemo(() => {
    // honor ?next= if present and safe (same-origin path)
    const n = searchParams.get("next");
    return n && n.startsWith("/") ? n : null;
  }, [searchParams]);

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  /** If already logged in, route based on account type (or ?next=) */
  const routeByRole = useCallback(
    async (emailFromSession?: string) => {
      const target = next;
      const accountType = await fetchAccountType(emailFromSession ?? null);

      if (target) {
        router.replace(target);
        return;
      }

      if (accountType === "applicant") {
        router.replace("/student");
      } else if (accountType === "employer") {
        router.replace("/dashboard");
      } else if (accountType === "university") {
        router.replace("/university/dashboard");
      } else {
        // Fallback: if accountType not set yet, prefer student (matches your new flow)
        router.replace("/student");
      }
    },
    [next, router]
  );

  useEffect(() => {
    if (!isPending && session?.user?.email) {
      void routeByRole(session.user.email);
    }
  }, [isPending, session?.user?.email, routeByRole]);

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      toast.success("Account created successfully! Please log in.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await authClient.signIn.email({
        email: formData.email.trim(),
        password: formData.password,
        rememberMe: formData.rememberMe,
        // We still pass a callbackURL, but we'll immediately route by role below.
        callbackURL: next || "/login",
      });

      if (error?.code) {
        toast.error(
          "Invalid email or password. Please make sure you have already registered an account and try again."
        );
        setIsLoading(false);
        return;
      }

      toast.success("Login successful!");

      // Wait a moment for session to be established, then redirect
      setTimeout(async () => {
        try {
          const { data: sessionData } = await authClient.getSession();
          if (sessionData?.user?.email) {
            console.log("Session found after login, redirecting...");
            await routeByRole(sessionData.user.email);
          } else {
            console.log("No session found, using fallback redirect");
            router.push("/student");
          }
        } catch (error) {
          console.error("Error checking session after login:", error);
          router.push("/student");
        }
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      toast.error("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      // After Google auth, you'll land back on /login (or ?next=…),
      // and the session effect above will redirect by role.
      await authClient.signIn.social({
        provider: "google",
        callbackURL: next || "/login",
      });
    } catch {
      toast.error("Google sign-in failed. Please try again.");
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

  // If session exists, we're redirecting via effect; avoid flicker.
  if (session?.user) return null;

  return (
    <div className="min-h-screen flex relative">
      {/* Back Button */}
      <Link
        href="/"
        className="absolute top-6 left-6 z-10 flex items-center gap-2 text-white hover:text-gray-200 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back to Home</span>
      </Link>

      {/* Left Side - Background Image */}
      <div className="w-1/2 h-screen relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/login/bg-2.png')" }}
        />
        {/* Logo in top right corner */}
        <div className="absolute top-6 right-6 z-10">
          <Image
            src="/images/talentflow-logo.svg"
            alt="Connectra logo"
            width={48}
            height={48}
            className="brightness-0 invert"
            priority
            unoptimized
          />
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-1/2 h-screen flex items-center justify-center bg-white">
        <div className="w-full max-w-md px-6">
          {/* Card Container */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 space-y-6">
            {/* Header */}
            <div className="text-center">
              <h1 className="font-display font-semibold text-[#1A1A1A] text-3xl md:text-4xl mb-2">
                Welcome back
              </h1>
              <p className="text-sm text-gray-500">
                Sign in to your account to continue
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full h-10 px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#3d6a4a]/40 focus:border-[#3d6a4a] transition-all text-sm"
                  placeholder="you@example.com"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="off"
                    required
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    className="w-full h-10 px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#3d6a4a]/40 focus:border-[#3d6a4a] transition-all text-sm pr-10"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={formData.rememberMe}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rememberMe: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-[#3d6a4a] border-gray-200 rounded focus:ring-2 focus:ring-[#3d6a4a]/40"
                />
                <label
                  htmlFor="rememberMe"
                  className="ml-2 text-sm text-gray-700"
                >
                  Remember me
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded bg-[#3d6a4a] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2f5239] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            {/* Google Sign In */}
            <div>
              <button
                type="button"
                onClick={handleGoogle}
                className="w-full rounded bg-[#f5f5f0] px-5 py-2.5 text-sm font-medium text-gray-900 transition-colors hover:bg-[#ebebe5] flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </button>
            </div>

            {/* Sign Up Link */}
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Don't have an account?{" "}
                <Link
                  href="/register"
                  className="text-[#3d6a4a] hover:text-[#2f5239] font-medium"
                >
                  Create account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ✅ Suspense-wrapped default export so useSearchParams is safe in Next 15
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <LoginPageInner />
    </Suspense>
  );
}
