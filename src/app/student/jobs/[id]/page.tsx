// src/app/student/jobs/[id]/page.tsx
import { notFound } from "next/navigation";
import { absoluteUrl } from "@/lib/url";
import { ExternalLink } from "lucide-react";

async function getJob(id: string) {
  const url = await absoluteUrl(`/api/jobs/${id}`);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

export default async function JobDetail({ params }: { params: { id: string } }) {
  const job = await getJob(params.id);
  if (!job) return notFound();

  const website = job.orgWebsite ?? job.organization?.website ?? null;

  return (
    <div className="h-[100dvh] max-w-full overflow-hidden overflow-x-clip">
      <div className="h-full w-full max-w-full overflow-y-auto px-6 py-6">
        <h1 className="text-2xl font-semibold">{job.title ?? "Untitled role"}</h1>
        <div className="mt-1 text-sm text-muted-foreground">
          {(job.orgName ?? job.organization?.name ?? "—")} • {(job.location ?? job.locationMode ?? "—")}
        </div>
        {website && (
          <div className="mt-2">
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Visit company website
            </a>
          </div>
        )}

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

        <div className="mt-6 flex gap-3">
          <a
            href={`/student/jobs/${params.id}/apply`}
            className="rounded-md border px-4 py-2"
          >
            Apply
          </a>
          <form action="/api/student/saved-jobs" method="post">
            <input type="hidden" name="jobId" value={job.id} />
            <button className="rounded-md border px-4 py-2">Save</button>
          </form>
        </div>
      </div>
    </div>
  );
}
