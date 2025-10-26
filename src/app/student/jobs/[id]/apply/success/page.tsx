// src/app/student/jobs/[id]/apply/success/page.tsx
"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Home } from "lucide-react";

export default function StudentApplicationSuccessPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id?.toString() ?? "";

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
            Thank you for applying! Your responses have been submitted. The hiring team
            will review your application and get back to you soon.
          </p>

          <div className="bg-blue-50 rounded-lg p-6 mb-8 text-left">
            <h2 className="font-semibold text-foreground mb-3">What happens next?</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>Your voice answers will be processed</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>The hiring team will review your responses</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">✓</span>
                <span>You’ll receive an email update soon</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/student/jobs">
              <Button size="lg" variant="default" className="gap-2">
                <Home className="w-5 h-5" />
                Back to Job Listings
              </Button>
            </Link>

            {jobId && (
              <Link href={`/student/jobs/${jobId}`}>
                <Button size="lg" variant="outline">
                  View Job Details
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
