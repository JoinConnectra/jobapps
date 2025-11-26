"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Check } from "lucide-react";

function RegisterStep3Inner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const accountType =
    (searchParams.get("type") as "applicant" | "employer") || "applicant";
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
  const [companyLogo, setCompanyLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If we somehow land here without the basics from step 2, bounce back
    if (!accountType || !email || !password || !name) {
      router.replace("/register");
    }
  }, [accountType, email, password, name, router]);

  const handleSubmit = async () => {
    if (!email || !password || !name) {
      toast.error("Missing registration details. Please restart sign-up.");
      router.replace("/register");
      return;
    }

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
      let orgId: number | null = null;
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
            companyName:
              accountType === "employer" ? companyName || undefined : undefined,
            companyUrl:
              accountType === "employer" ? companyUrl || undefined : undefined,
            universityId:
              accountType === "applicant"
                ? universityId
                  ? Number(universityId)
                  : null
                : null,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (accountType === "employer" && data.orgId) {
            orgId = data.orgId;
          }
        } else {
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

      // 4) Upload logo if provided (for employers only, after sign-in so we have token)
      if (accountType === "employer" && companyLogo && orgId) {
        try {
          // Wait a moment for token to be set
          await new Promise((resolve) => setTimeout(resolve, 500));
          const token = localStorage.getItem("bearer_token");

          if (token) {
            const formData = new FormData();
            formData.append("logo", companyLogo);

            const logoRes = await fetch(`/api/organizations/${orgId}/logo`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: formData,
            });

            if (!logoRes.ok) {
              console.error("Logo upload failed, but continuing registration");
              // Non-blocking: continue even if logo upload fails
            }
          }
        } catch (e) {
          console.error("Logo upload error:", e);
          // Non-blocking: continue even if logo upload fails
        }
      }

      // 5) Redirect by account type
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
    <div className="flex flex-col md:flex-row min-h-screen relative">
      {/* Back */}
      <Link
        href="/register/step2"
        className="absolute top-4 left-4 md:top-6 md:left-6 z-10 inline-flex items-center gap-2 text-sm text-white md:text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="font-medium hidden sm:inline">Back</span>
      </Link>

      {/* Left Side - BG */}
      <div className="w-full md:w-1/2 h-48 md:h-screen relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-no-repeat"
          style={{
            backgroundImage: "url('/register_bg.png')",
            backgroundPosition: "right center",
          }}
        />
        {/* Logo in top right corner */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-10">
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

      {/* Right Side - Form */}
      <div className="w-full md:w-1/2 min-h-[calc(100vh-12rem)] md:h-screen flex items-center justify-center bg-white py-8 md:py-0">
        <div className="w-full max-w-md px-4 sm:px-6">
          {/* Card Container */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 space-y-6">
            <div className="text-center">
              <h1 className="font-display font-semibold text-[#1A1A1A] text-3xl md:text-4xl mb-2">
                {accountType === "applicant"
                  ? "Student Details"
                  : "Organization Details"}
              </h1>
              <p className="text-sm text-gray-500">
                {accountType === "applicant"
                  ? "Finish setting up your student profile"
                  : "Finish setting up your employer account"}
              </p>
            </div>

            <div className="space-y-4">
              {accountType === "applicant" ? (
                <>
                  {/* University (optional for now) */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      University (optional)
                    </label>
                    <input
                      className="w-full h-10 rounded border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d6a4a]/40 focus:border-[#3d6a4a] transition-all"
                      placeholder="Enter university ID or leave blank"
                      value={universityId ?? ""}
                      onChange={(e) =>
                        setUniversityId(e.target.value || null)
                      }
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Company Name
                    </label>
                    <input
                      className="w-full h-10 rounded border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d6a4a]/40 focus:border-[#3d6a4a] transition-all"
                      placeholder="e.g. Packages Ltd."
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Company URL
                    </label>
                    <input
                      className="w-full h-10 rounded border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d6a4a]/40 focus:border-[#3d6a4a] transition-all"
                      placeholder="https://example.com"
                      value={companyUrl}
                      onChange={(e) => setCompanyUrl(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">
                      Company Logo (optional)
                    </label>
                    <div className="flex items-center gap-4">
                      {logoPreview ? (
                        <div className="relative">
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="w-16 h-16 rounded-lg object-cover border-2 border-gray-200"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCompanyLogo(null);
                              setLogoPreview(null);
                            }}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 text-xs"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                          <span className="text-xs text-gray-400">Logo</span>
                        </div>
                      )}
                      <label
                        htmlFor="logo-upload"
                        className="cursor-pointer inline-flex items-center justify-center rounded bg-[#3d6a4a] text-white hover:bg-[#2f5239] h-10 px-4 text-sm transition-colors"
                      >
                        {logoPreview ? "Change Logo" : "Upload Logo"}
                      </label>
                      <input
                        id="logo-upload"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Validate file type
                            const allowedTypes = [
                              "image/jpeg",
                              "image/jpg",
                              "image/png",
                              "image/gif",
                              "image/webp",
                            ];
                            if (!allowedTypes.includes(file.type)) {
                              toast.error(
                                "Please upload a valid image file (JPEG, PNG, GIF, or WebP)"
                              );
                              return;
                            }
                            // Validate file size (5MB max)
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error(
                                "Image size must be less than 5MB"
                              );
                              return;
                            }
                            setCompanyLogo(file);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setLogoPreview(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Max size: 5MB. Supported: JPEG, PNG, GIF, WebP
                    </p>
                  </div>
                </>
              )}

              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full rounded bg-[#3d6a4a] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2f5239] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" />
                {isLoading ? "Creating your account..." : "Create account"}
              </button>

              <p className="text-xs text-gray-500 text-center">
                By continuing, you agree to our Terms and acknowledge our
                Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Suspense wrapper so useSearchParams is safe in Next 15 streaming/partial render
export default function RegisterStep3Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading...</p>
          </div>
        </div>
      }
    >
      <RegisterStep3Inner />
    </Suspense>
  );
}
