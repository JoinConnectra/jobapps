import Link from "next/link";
import { absoluteUrl } from "@/lib/url";

async function getJobs() {
  const url = await absoluteUrl("/api/jobs");
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export default async function JobsPage() {
  const jobs = await getJobs();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/student" className="hover:text-gray-700">Student</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Jobs</span>
        </nav>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">Jobs</h1>
      </div>

      {/* List */}
      <div className="grid gap-4">
        {jobs.length === 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
            No jobs yet.
          </div>
        )}

        {jobs.map((job: any) => (
          <Link
            key={job.id}
            href={`/student/jobs/${job.id}`}
            className="rounded-lg border border-gray-200 bg-white p-4 hover:bg-[#F5F1E8]/40 transition-colors block"
          >
            <div className="font-medium text-gray-900">{job.title ?? "Untitled role"}</div>
            <div className="text-sm text-gray-500">
              {(job.organization?.name ?? "—")} • {(job.location ?? job.locationMode ?? "—")}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
