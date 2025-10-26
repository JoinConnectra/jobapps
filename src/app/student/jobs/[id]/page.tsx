// src/app/jobs/[id]/page.tsx
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
    <div className="h-[100dvh] max-w-full overflow-hidden overflow-x-clip">
      <div className="h-full w-full max-w-full overflow-y-auto px-6 py-6">
        <h1 className="text-2xl font-semibold">{job.title ?? "Untitled role"}</h1>
        <div className="mt-1 text-sm text-muted-foreground">
          {(job.organization?.name ?? "—")} • {(job.location ?? job.locationMode ?? "—")}
        </div>

        {/* descriptionHtml is assumed sanitized by the API */}
        <div
          className="
            mt-6 prose max-w-full dark:prose-invert leading-relaxed
            break-words
            prose-a:break-words
            prose-pre:whitespace-pre-wrap prose-pre:overflow-x-auto
            prose-table:block prose-table:overflow-x-auto
            prose-img:max-w-full prose-img:h-auto
          "
          dangerouslySetInnerHTML={{ __html: job.descriptionHtml ?? "" }}
        />

        {/* Form posts are fine with relative URLs */}
        <form action="/api/student/applications" method="post" className="mt-6 flex gap-3">
          <input type="hidden" name="jobId" value={job.id} />
          <button className="rounded-md border px-4 py-2">Apply</button>
          <button
            formAction="/api/student/saved-jobs"
            name="jobId"
            value={job.id}
            className="rounded-md border px-4 py-2"
          >
            Save
          </button>
        </form>
      </div>
    </div>
  );
}
