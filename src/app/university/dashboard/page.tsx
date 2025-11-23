"use client";

import Link from "next/link";
import UniversityDashboardShell from "@/components/university/UniversityDashboardShell";

export default function UniversityDashboardPage() {
  return (
    <UniversityDashboardShell title="Overview">
      <div className="max-w-5xl">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold">
            Welcome to your University Portal
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            Manage company access requests, approved partners, events, and
            students from one place.
          </p>

          <div className="mt-4 space-y-2 text-sm">
            <p>
              👉{" "}
              <Link
                className="underline text-[#6a994e]"
                href="/university/dashboard/requests"
              >
                Go to Partner Requests
              </Link>{" "}
              to review and approve company access.
            </p>
            <p>
              👉{" "}
              <Link
                className="underline text-[#6a994e]"
                href="/university/dashboard/students"
              >
                View Students
              </Link>{" "}
              to see students linked to your university.
            </p>
            <p>
              👉{" "}
              <Link
                className="underline text-[#6a994e]"
                href="/university/dashboard/events"
              >
                Manage Events
              </Link>{" "}
              to schedule campus hiring and info sessions.
            </p>
          </div>
        </div>
      </div>
    </UniversityDashboardShell>
  );
}
