"use client";

import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Home } from "lucide-react";
import Link from "next/link";

export default function ApplicationSuccessPage() {
  const params = useParams();

  return (
    <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="bg-white rounded-2xl shadow-lg p-12">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>
          
          <h1 className="text-4xl font-display font-bold text-foreground mb-4">
            Application Submitted! 🎉
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8">
            Thank you for applying! Your voice responses have been successfully
            recorded and submitted. The hiring team will review your application
            and get back to you soon.
          </p>

          <div className="bg-blue-50 rounded-lg p-6 mb-8 text-left">
            <h2 className="font-semibold text-foreground mb-3">What happens next?</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Your voice answers will be transcribed using AI</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>The hiring team will review your responses</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>You'll receive an email update within 3-5 business days</span>
              </li>
            </ul>
          </div>

          <Link href="/">
            <Button size="lg" className="gap-2">
              <Home className="w-5 h-5" />
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
