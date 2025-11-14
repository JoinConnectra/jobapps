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
          className="absolute inset-0 bg-cover bg-no-repeat"
          style={{
            backgroundImage: "url('/register_bg.png')",
            backgroundPosition: 'right center'
          }}
        />
      </div>

      {/* Right Side - Account Type Selection */}
      <div className="w-1/2 h-screen flex items-center justify-center bg-white">
        <div className="w-full max-w-md px-6">
          {/* Card Container */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 space-y-6">
            {/* Header */}
            <div className="text-center">
              <h1 className="font-display font-semibold text-[#1A1A1A] text-3xl md:text-4xl mb-2">
                Create your account
              </h1>
              <p className="text-sm text-gray-500">
                Choose your account type to get started
              </p>
            </div>

            {/* Account Type Selection */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">I am a</label>
                <div className="space-y-3">
                  <button
                    onClick={() => handleAccountTypeSelect('applicant')}
                    className={`w-full p-4 border-2 rounded text-left transition-all ${
                      accountType === 'applicant' 
                        ? 'border-[#3d6a4a] bg-[#3d6a4a]/5 text-[#3d6a4a]' 
                        : 'border-gray-200 hover:border-[#3d6a4a]/50 bg-white'
                    }`}
                  >
                    <div className="font-medium text-gray-900">Applicant</div>
                    <div className="text-sm text-gray-500">Looking for job opportunities</div>
                  </button>
                  
                  <button
                    onClick={() => handleAccountTypeSelect('employer')}
                    className={`w-full p-4 border-2 rounded text-left transition-all ${
                      accountType === 'employer' 
                        ? 'border-[#3d6a4a] bg-[#3d6a4a]/5 text-[#3d6a4a]' 
                        : 'border-gray-200 hover:border-[#3d6a4a]/50 bg-white'
                    }`}
                  >
                    <div className="font-medium text-gray-900">Company</div>
                    <div className="text-sm text-gray-500">Hiring talent for your organization</div>
                  </button>

                  <button
                    onClick={() => handleAccountTypeSelect('university')}
                    className={`w-full p-4 border-2 rounded text-left transition-all ${
                      accountType === 'university' 
                        ? 'border-[#3d6a4a] bg-[#3d6a4a]/5 text-[#3d6a4a]' 
                        : 'border-gray-200 hover:border-[#3d6a4a]/50 bg-white'
                    }`}
                  >
                    <div className="font-medium text-gray-900">Educational Institution</div>
                    <div className="text-sm text-gray-500">University or College portal</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Continue Button */}
            <button
              onClick={handleContinue}
              disabled={!accountType}
              className="w-full rounded bg-[#3d6a4a] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2f5239] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Sign In Link */}
            <div className="text-center">
              <p className="text-sm text-gray-500">
                Already have an account?{" "}
                <Link href="/login" className="text-[#3d6a4a] hover:text-[#2f5239] font-medium">
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