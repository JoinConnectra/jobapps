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
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Jobs</h1>
      <div className="grid gap-4">
        {jobs.map((job: any) => (
          <a
            key={job.id}
            href={`/student/jobs/${job.id}`}
            className="rounded-lg border p-4 hover:bg-muted/30"
          >
            <div className="font-medium">{job.title}</div>
            <div className="text-sm text-muted-foreground">
              {job.organization?.name} • {job.location ?? job.locationMode ?? "—"}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
