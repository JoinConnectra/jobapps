"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";

function RegisterStep2Inner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountType = searchParams.get("type") as "applicant" | "employer";

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!accountType || !["applicant", "employer"].includes(accountType)) {
      router.push("/register");
    }
  }, [accountType, router]);

  const checkEmailExists = async (email: string): Promise<boolean> => {
    if (!email || !email.includes("@")) {
      setEmailError("");
      return false;
    }

    setIsCheckingEmail(true);
    setEmailError("");

    try {
      const response = await fetch(
        `/api/users/check-email?email=${encodeURIComponent(email)}`
      );
      const data = await response.json();

      if (data.exists) {
        setEmailError(
          "An account with this email already exists. Please sign in instead."
        );
        setIsCheckingEmail(false);
        return true;
      } else {
        setEmailError("");
        setIsCheckingEmail(false);
        return false;
      }
    } catch (error) {
      console.error("Error checking email:", error);
      setIsCheckingEmail(false);
      // Don't block registration if check fails, just log error
      return false;
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setFormData({ ...formData, email: newEmail });

    // Clear error when user starts typing
    if (emailError) {
      setEmailError("");
    }
  };

  const handleEmailBlur = () => {
    if (formData.email) {
      void checkEmailExists(formData.email);
    }
  };

  const handleContinue = async () => {
    // Validate form - EXACTLY like the original registration
    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (formData.password.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    // Check email before continuing
    if (emailError) {
      toast.error("Please fix the email error before continuing");
      return;
    }

    // Double-check email one more time before proceeding
    const emailExists = await checkEmailExists(formData.email);
    if (emailExists) {
      toast.error(
        "An account with this email already exists. Please sign in instead."
      );
      return; // Don't proceed if email exists
    }

    // Navigate to step 3 with form data
    const params = new URLSearchParams({
      type: accountType,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
    });

    router.push(`/register/step3?${params.toString()}`);
  };

  if (!accountType) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative">
      {/* Back Button */}
      <Link
        href="/register"
        className="absolute top-4 left-4 md:top-6 md:left-6 z-10 flex items-center gap-2 text-white hover:text-gray-200 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium hidden sm:inline">Back</span>
      </Link>

      {/* Left Side - Background Image */}
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

      {/* Right Side - Basic Information Form */}
      <div className="w-full md:w-1/2 min-h-[calc(100vh-12rem)] md:h-screen flex items-center justify-center bg-white py-8 md:py-0">
        <div className="w-full max-w-md px-4 sm:px-6">
          {/* Card Container */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 space-y-6">
            {/* Header */}
            <div className="text-center">
              <h1 className="font-display font-semibold text-[#1A1A1A] text-3xl md:text-4xl mb-2">
                Basic Information
              </h1>
              <p className="text-sm text-gray-500">Tell us about yourself</p>
            </div>

            {/* Form */}
            <div className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Full name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full h-10 px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#3d6a4a]/40 focus:border-[#3d6a4a] transition-all text-sm"
                  placeholder="Ahmed Khan"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  className={`w-full h-10 px-3 py-2 border rounded focus:outline-none focus:ring-2 transition-all text-sm ${
                    emailError
                      ? "border-red-500 focus:ring-red-500 focus:border-red-500"
                      : "border-gray-200 focus:ring-[#3d6a4a]/40 focus:border-[#3d6a4a]"
                  } ${isCheckingEmail ? "opacity-50" : ""}`}
                  placeholder="you@example.com"
                  disabled={isCheckingEmail}
                />
                {emailError && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <span>⚠️</span>
                    <span>{emailError}</span>
                  </p>
                )}
                {isCheckingEmail && !emailError && (
                  <p className="text-xs text-gray-500">Checking email...</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700"
                >
                  Phone number{" "}
                  <span className="text-gray-500 text-xs">(optional)</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full h-10 px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#3d6a4a]/40 focus:border-[#3d6a4a] transition-all text-sm"
                  placeholder="+92 300 1234567"
                />
              </div>

              {/* Password */}
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
                    placeholder="At least 8 characters"
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

              {/* Confirm Password */}
              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700"
                >
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="off"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="w-full h-10 px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-[#3d6a4a]/40 focus:border-[#3d6a4a] transition-all text-sm pr-10"
                    placeholder="Re-enter your password"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Continue Button */}
            <button
              onClick={handleContinue}
              className="w-full rounded bg-[#3d6a4a] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2f5239] flex items-center justify-center gap-2"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Sign In Link */}
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-[#3d6a4a] hover:text-[#2f5239] font-medium"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Suspense wrapper so useSearchParams is safe in Next 15
export default function RegisterStep2Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-muted-foreground">
              Loading registration...
            </p>
          </div>
        </div>
      }
    >
      <RegisterStep2Inner />
    </Suspense>
  );
}
