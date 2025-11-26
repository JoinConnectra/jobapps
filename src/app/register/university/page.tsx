"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { toast } from 'sonner';

export default function UniversityRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [form, setForm] = useState({
    universityName: '',
    domain: '',
    contactEmail: '',
    adminName: '',
    password: '',
    location: '',
    type: 'public',
    description: '',
  });

  const update = (k: string, v: string) => {
    setForm(s => ({ ...s, [k]: v }));
    
    // Clear email error when user changes email
    if (k === 'contactEmail' && emailError) {
      setEmailError("");
    }
  };

  const checkEmailExists = async (email: string): Promise<boolean> => {
    if (!email || !email.includes("@")) {
      setEmailError("");
      return false;
    }

    setIsCheckingEmail(true);
    setEmailError("");

    try {
      const response = await fetch(`/api/users/check-email?email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (data.exists) {
        setEmailError("An account with this email already exists. Please sign in instead.");
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
      return false;
    }
  };

  const handleEmailBlur = () => {
    if (form.contactEmail) {
      checkEmailExists(form.contactEmail);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check email before submitting
    if (emailError) {
      toast.error('Please fix the email error before submitting');
      return;
    }

    // Double-check email one more time before proceeding
    const emailExists = await checkEmailExists(form.contactEmail);
    if (emailExists) {
      toast.error('An account with this email already exists. Please sign in instead.');
      return;
    }

    setLoading(true);
    try {
      // 1. Register user with Better Auth
      const signupResponse = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.contactEmail,
          password: form.password,
          name: form.adminName,
        }),
      });

      if (!signupResponse.ok) {
        const errorData = await signupResponse.json();
        throw new Error(errorData.error || "Failed to create user account");
      }

      // 2. Sign in the newly created user
      const signInResponse = await authClient.signInWithEmail({
        email: form.contactEmail,
        password: form.password,
      });

      if (signInResponse.error) {
        throw new Error(signInResponse.error.code || "Failed to sign in after registration");
      }

      // 3. Register university in our database (now that user is authenticated)
      const universityRegisterResponse = await fetch("/api/university/register", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("bearer_token")}`,
        },
        body: JSON.stringify({
          universityName: form.universityName,
          domain: form.domain,
          contactEmail: form.contactEmail,
          adminName: form.adminName,
          location: form.location,
          type: form.type,
          description: form.description,
        }),
      });

      if (!universityRegisterResponse.ok) {
        const errorData = await universityRegisterResponse.json();
        throw new Error(errorData.error || "Failed to register university");
      }

      toast.success("University account created successfully!");
      router.push("/university/dashboard");
    } catch (error) {
      console.error("University registration error:", error);
      toast.error(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row relative">
      {/* Back Button */}
      <Link 
        href="/" 
        className="absolute top-4 left-4 md:top-6 md:left-6 z-10 flex items-center gap-2 text-white hover:text-gray-200 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium hidden sm:inline">Back to Home</span>
      </Link>

      {/* Left Side - Background Image */}
      <div className="w-full md:w-1/2 h-48 md:h-screen relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-no-repeat"
          style={{ 
            backgroundImage: "url('/register_bg.png')",
            backgroundPosition: 'right center'
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

      {/* Right Side - University Registration Form */}
      <div className="w-full md:w-1/2 min-h-[calc(100vh-12rem)] md:h-screen flex items-center justify-center bg-white py-8 md:py-0">
        <div className="w-full max-w-md px-4 sm:px-6">
          {/* Card Container */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 space-y-6">
            {/* Header */}
            <div className="text-center">
              <h1 className="font-display font-semibold text-[#1A1A1A] text-3xl md:text-4xl mb-2">Create your university account</h1>
              <p className="text-sm text-gray-500">Institution portal for managing company partnerships</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-700">University name</Label>
                <Input 
                  value={form.universityName} 
                  onChange={e => update('universityName', e.target.value)} 
                  className="border-gray-200 focus:ring-[#3d6a4a]/40 focus:border-[#3d6a4a]"
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-700">Domain</Label>
                <Input 
                  placeholder="lums.edu.pk" 
                  value={form.domain} 
                  onChange={e => update('domain', e.target.value)} 
                  className="border-gray-200 focus:ring-[#3d6a4a]/40 focus:border-[#3d6a4a]"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-gray-700">Admin name</Label>
                  <Input 
                    value={form.adminName} 
                    onChange={e => update('adminName', e.target.value)} 
                    className="border-gray-200 focus:ring-[#3d6a4a]/40 focus:border-[#3d6a4a]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Contact email</Label>
                  <Input 
                    type="email" 
                    value={form.contactEmail} 
                    onChange={e => update('contactEmail', e.target.value)} 
                    onBlur={handleEmailBlur}
                    className={emailError ? "border-red-500 focus:ring-red-500" : "border-gray-200 focus:ring-[#3d6a4a]/40 focus:border-[#3d6a4a]"}
                    disabled={isCheckingEmail}
                    required 
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
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-gray-700">Password</Label>
                  <Input 
                    type="password" 
                    value={form.password} 
                    onChange={e => update('password', e.target.value)} 
                    className="border-gray-200 focus:ring-[#3d6a4a]/40 focus:border-[#3d6a4a]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Location</Label>
                  <Input 
                    value={form.location} 
                    onChange={e => update('location', e.target.value)} 
                    className="border-gray-200 focus:ring-[#3d6a4a]/40 focus:border-[#3d6a4a]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-gray-700">Type</Label>
                  <Input 
                    value={form.type} 
                    onChange={e => update('type', e.target.value)} 
                    className="border-gray-200 focus:ring-[#3d6a4a]/40 focus:border-[#3d6a4a]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Description</Label>
                  <Input 
                    value={form.description} 
                    onChange={e => update('description', e.target.value)} 
                    className="border-gray-200 focus:ring-[#3d6a4a]/40 focus:border-[#3d6a4a]"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full rounded bg-[#3d6a4a] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2f5239] disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={loading}
              >
                {loading ? 'Creating…' : 'Create account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}


