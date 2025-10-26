"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const [accountType, setAccountType] = useState<"applicant" | "employer" | "university" | null>(null);

  const handleAccountTypeSelect = (type: "applicant" | "employer" | "university") => {
    setAccountType(type);
  };

  const handleContinue = () => {
    if (accountType === 'university') {
      window.location.href = `/register/university`;
      return;
    }
    if (accountType) {
      // Navigate to the next step
      window.location.href = `/register/step2?type=${accountType}`;
    }
  };

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
          style={{
            backgroundImage: "url('/register_bg.png')"
          }}
        />
      </div>

      {/* Right Side - Account Type Selection */}
      <div className="w-1/2 h-screen flex items-center justify-center bg-white">
        <div className="w-[320px] space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-foreground mb-2">
              Create your account
            </h1>
            <p className="text-sm text-muted-foreground">
              Choose your account type to get started
            </p>
          </div>

          {/* Account Type Selection */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">I am a</label>
              <div className="space-y-3">
                <button
                  onClick={() => handleAccountTypeSelect('applicant')}
                  className={`w-full p-4 border-2 rounded-md text-left transition-all ${
                    accountType === 'applicant' 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium">Applicant</div>
                  <div className="text-sm text-muted-foreground">Looking for job opportunities</div>
                </button>
                
                <button
                  onClick={() => handleAccountTypeSelect('employer')}
                  className={`w-full p-4 border-2 rounded-md text-left transition-all ${
                    accountType === 'employer' 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium">Company</div>
                  <div className="text-sm text-muted-foreground">Hiring talent for your organization</div>
                </button>

                <button
                  onClick={() => handleAccountTypeSelect('university')}
                  className={`w-full p-4 border-2 rounded-md text-left transition-all ${
                    accountType === 'university' 
                      ? 'border-primary bg-primary/5 text-primary' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="font-medium">Educational Institution</div>
                  <div className="text-sm text-muted-foreground">University or College portal</div>
                </button>
              </div>
            </div>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!accountType}
            className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
          >
            Continue
            <ArrowRight className="w-4 h-4" />
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