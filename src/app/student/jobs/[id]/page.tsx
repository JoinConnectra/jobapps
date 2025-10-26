import { notFound } from "next/navigation";
import { absoluteUrl } from "@/lib/url";

async function getJob(id: string) {
  const url = await absoluteUrl(`/api/jobs/${id}`);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export default async function JobDetail({ params }: { params: { id: string } }) {
  const job = await getJob(params.id);
  if (!job) return notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{job.title}</h1>
      <div className="text-sm text-muted-foreground">
        {job.organization?.name} • {job.location ?? job.locationMode ?? "—"}
      </div>

      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: job.descriptionHtml ?? "" }}
      />

      {/* Form posts are fine with relative URLs */}
      <form action="/api/student/applications" method="post" className="mt-6">
        <input type="hidden" name="jobId" value={job.id} />
        <button className="rounded-md border px-4 py-2">Apply</button>
        <button
          formAction="/api/student/saved-jobs"
          name="jobId"
          value={job.id}
          className="ml-3 rounded-md border px-4 py-2"
        >
          Save
        </button>
      </form>
    </div>
  );
}
