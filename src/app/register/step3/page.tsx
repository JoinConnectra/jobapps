"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";

export default function RegisterStep3Page() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountType = searchParams.get('type') as "applicant" | "employer";
  const name = searchParams.get('name') || '';
  const email = searchParams.get('email') || '';
  const phone = searchParams.get('phone') || '';
  const password = searchParams.get('password') || '';
  
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    companyUrl: "",
    universityId: "",
    locale: "en",
  });

  useEffect(() => {
    if (!accountType || !['applicant', 'employer'].includes(accountType)) {
      router.push('/register');
    }
  }, [accountType, router]);

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      // Create the user account with Better Auth
      const { error } = await authClient.signUp.email({
        email: email,
        name: name,
        password: password,
      });

      if (error?.code) {
        toast.error("User already registered with this email");
        setIsLoading(false);
        return;
      }

      // Bootstrap profile and optional organization - EXACTLY like the original
      try {
        const response = await fetch("/api/bootstrap/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name,
            email: email,
            phone: phone || null,
            locale: formData.locale,
            accountType: accountType,
            companyName: accountType === 'employer' ? formData.companyName : undefined,
            companyUrl: accountType === 'employer' ? formData.companyUrl : undefined,
            universityId: accountType === 'applicant' ? formData.universityId || null : null,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to bootstrap user profile');
        }
      } catch (bootstrapError) {
        console.error('Bootstrap error:', bootstrapError);
        // Continue anyway - the auth user was created
      }

      toast.success("Account created successfully! Please log in.");
      router.push("/login?registered=true");
    } catch (error) {
      console.error('Registration error:', error);
      toast.error("An unexpected error occurred");
      setIsLoading(false);
    }
  };

  if (!accountType) {
    return null;
  }

  return (
    <div className="min-h-screen flex relative">
      {/* Back Button */}
      <Link 
        href={`/register/step2?type=${accountType}`} 
        className="absolute top-6 left-6 z-10 flex items-center gap-2 text-white hover:text-gray-200 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back</span>
      </Link>

      {/* Left Side - Background Image */}
      <div className="w-1/2 h-screen relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/register_bg.png')"
          }}
        />
      </div>

      {/* Right Side - Specific Information Form */}
      <div className="w-1/2 h-screen flex items-center justify-center bg-white">
        <div className="w-[320px] space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-foreground mb-2">
              {accountType === 'applicant' ? 'Educational Background' : 'Company Information'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {accountType === 'applicant' 
                ? 'Tell us about your education' 
                : 'Tell us about your company'
              }
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Applicant Fields */}
            {accountType === 'applicant' && (
              <>
                <div className="space-y-2">
                  <label htmlFor="universityId" className="block text-sm font-medium text-foreground">
                    Educational institution <span className="text-muted-foreground text-xs">(optional)</span>
                  </label>
                  <input 
                    id="universityId" 
                    value={formData.universityId} 
                    onChange={(e)=>setFormData({...formData,universityId:e.target.value})} 
                    className="w-full h-10 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm" 
                    placeholder="Enter university ID or leave blank" 
                  />
                  <p className="text-xs text-muted-foreground">We'll auto-verify via email domain later.</p>
                </div>
              </>
            )}

            {/* Company Fields */}
            {accountType === 'employer' && (
              <>
                <div className="space-y-2">
                  <label htmlFor="companyName" className="block text-sm font-medium text-foreground">
                    Company name
                  </label>
                  <input 
                    id="companyName" 
                    value={formData.companyName} 
                    onChange={(e)=>setFormData({...formData,companyName:e.target.value})} 
                    required 
                    className="w-full h-10 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm" 
                    placeholder="Acme Inc." 
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="companyUrl" className="block text-sm font-medium text-foreground">
                    Company link <span className="text-muted-foreground text-xs">(optional)</span>
                  </label>
                  <input 
                    id="companyUrl" 
                    value={formData.companyUrl} 
                    onChange={(e)=>setFormData({...formData,companyUrl:e.target.value})} 
                    className="w-full h-10 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm" 
                    placeholder="https://acme.com" 
                  />
                </div>
              </>
            )}

            {/* Language - Common for both */}
            <div className="space-y-2">
              <label htmlFor="locale" className="block text-sm font-medium text-foreground">
                Preferred language
              </label>
              <select
                id="locale"
                name="locale"
                value={formData.locale}
                onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
                className="w-full h-10 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm"
              >
                <option value="en">English</option>
                <option value="ur">اردو (Urdu)</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={isLoading || (accountType === 'employer' && !formData.companyName)}
            className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
          >
            {isLoading ? "Creating account..." : "Create account"}
            {!isLoading && <Check className="w-4 h-4" />}
          </button>

          {/* Sign In Link */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:text-primary/80 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
