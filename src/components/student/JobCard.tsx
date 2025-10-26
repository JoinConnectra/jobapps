import Link from "next/link";

export default function JobCard({ job }: { job: any }) {
  return (
    <div className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-medium">{job.title}</div>
          <div className="text-sm text-muted-foreground">
            {job.organization?.name ?? "—"} • {job.location ?? job.locationMode ?? "—"}
          </div>
        </div>
        <Link href={`/student/jobs/${job.id}`} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
          View
        </Link>
      </div>
    </div>
  );
}
