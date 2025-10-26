"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";

export default function RegisterStep3Page() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const accountType = (searchParams.get("type") as "applicant" | "employer") || "applicant";
  const name = searchParams.get("name") || "";
  const email = searchParams.get("email") || "";
  const phone = searchParams.get("phone") || "";
  const password = searchParams.get("password") || "";
  const locale = searchParams.get("locale") || "en";

  // Applicant inputs
  const [universityId, setUniversityId] = useState<string | null>(null);

  // Employer inputs
  const [companyName, setCompanyName] = useState<string>("");
  const [companyUrl, setCompanyUrl] = useState<string>("");

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!accountType) {
      router.replace("/register");
    }
  }, [accountType, router]);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      // 1) Create auth user
      const { error } = await authClient.signUp.email({
        email,
        name,
        password,
      });

      if (error?.code) {
        toast.error("User already registered with this email");
        setIsLoading(false);
        return;
      }

      // 2) Bootstrap app tables (users + studentProfile or organization+membership)
      try {
        const res = await fetch("/api/bootstrap/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email,
            phone: phone || null,
            locale,
            accountType,
            companyName: accountType === "employer" ? companyName : undefined,
            companyUrl: accountType === "employer" ? companyUrl : undefined,
            universityId: accountType === "applicant" ? (universityId ? Number(universityId) : null) : null,
          }),
        });
        if (!res.ok) {
          console.error("Bootstrap failed:", await res.text());
          // Non-blocking: continue to sign-in so user can proceed
        }
      } catch (e) {
        console.error("Bootstrap error:", e);
      }

      // 3) Auto sign-in
      const login = await authClient.signIn.email({
        email,
        password,
      });
      if (login?.error) {
        toast.success("Account created. Please sign-in.");
        router.replace("/login?registered=true");
        return;
      }

      // 4) Redirect by account type
      toast.success("Welcome!");
      if (accountType === "applicant") {
        router.replace("/student");
      } else {
        router.replace("/dashboard");
      }
    } catch (err) {
      console.error("Registration error:", err);
      toast.error("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Back */}
      <Link href="/register/step2" className="absolute left-6 top-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        <span className="font-medium">Back</span>
      </Link>

      {/* Left Side - BG */}
      <div className="w-1/2 h-screen relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/register_bg.png')" }}
        />
      </div>

      {/* Right Side - Form */}
      <div className="w-1/2 h-screen flex items-center justify-center bg-white">
        <div className="w-[420px] space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold mb-1">
              {accountType === "applicant" ? "Student Details" : "Organization Details"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {accountType === "applicant" ? "Finish setting up your student profile" : "Finish setting up your employer account"}
            </p>
          </div>

          <div className="space-y-4">
            {accountType === "applicant" ? (
              <>
                {/* University (optional for now) */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">University (optional)</label>
                  <input
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                    placeholder="Enter university ID or leave blank"
                    value={universityId ?? ""}
                    onChange={(e) => setUniversityId(e.target.value || null)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Company Name</label>
                  <input
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                    placeholder="e.g. Packages Ltd."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Company URL</label>
                  <input
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                    placeholder="https://example.com"
                    value={companyUrl}
                    onChange={(e) => setCompanyUrl(e.target.value)}
                  />
                </div>
              </>
            )}

            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full h-10 inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {isLoading ? "Creating your account..." : "Create account"}
            </button>

            <p className="text-xs text-muted-foreground text-center">
              By continuing, you agree to our Terms and acknowledge our Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
