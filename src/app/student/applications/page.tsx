export const dynamic = "force-dynamic";

import Link from "next/link";
import { absoluteUrl } from "@/lib/url";
import { headers } from "next/headers";

async function getApplications() {
  const url = await absoluteUrl("/api/student/applications");
  const h = await headers();
  const cookie = h.get("cookie") ?? "";

  const res = await fetch(url, {
    cache: "no-store",
    headers: { cookie },
  });

  if (!res.ok) {
    // Bubble up a clear error so the page can render a message
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Applications API ${res.status}: ${msg || "Failed"}`);
  }

  return res.json();
}

function formatWhen(d: string | Date) {
  try {
    const dt = new Date(d);
    return dt.toLocaleString();
  } catch {
    return "";
  }
}

export default async function ApplicationsPage() {
  let apps: any[] = [];
  let error: string | null = null;

  try {
    apps = await getApplications();
  } catch (e: any) {
    error = e?.message || "Failed to load applications.";
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/student" className="hover:text-gray-700">Student</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Applications</span>
        </nav>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">My Applications</h1>
      </div>

      {/* Error */}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* List */}
      {!error && apps.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
          No applications yet.
        </div>
      ) : null}

      {!error && apps.length > 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white divide-y">
          {apps.map((a: any) => (
            <Link
              key={a.id}
              href={`/student/applications/${a.id}`}
              className="flex items-center justify-between p-4 hover:bg-[#F5F1E8]/40 transition-colors"
            >
              <div>
                <div className="font-medium text-gray-900">
                  {a.job?.title ?? "Untitled job"}
                </div>
                <div className="text-sm text-gray-500">
                  {a.organization?.name ?? "—"} • {formatWhen(a.updatedAt)}
                </div>
              </div>
              <span className="text-xs rounded border border-gray-200 px-2 py-1 bg-white text-gray-700">
                {a.status ?? "Applied"}
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
