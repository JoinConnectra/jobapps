export const dynamic = "force-dynamic";

import { absoluteUrl } from "@/lib/url";
import { headers } from "next/headers";

async function getApplication(id: string) {
  const url = await absoluteUrl(`/api/student/applications/${id}`);
  const h = await headers();
  const cookie = h.get("cookie") ?? "";

  const res = await fetch(url, {
    cache: "no-store",
    headers: { cookie },
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(`Application API ${res.status}: ${msg || "Failed"}`);
  }
  return res.json();
}

export default async function ApplicationDetail({ params }: { params: { id: string } }) {
  let app: any = null;
  let error: string | null = null;

  try {
    app = await getApplication(params.id);
  } catch (e: any) {
    error = e?.message || "Failed to load application.";
  }

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  if (!app) {
    return <div className="text-sm text-red-600">Failed to load application.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <a href="/student" className="hover:text-gray-700">Student</a>
          <span>/</span>
          <a href="/student/applications" className="hover:text-gray-700">Applications</a>
          <span>/</span>
          <span className="text-gray-900 font-medium">Detail</span>
        </nav>
        <h1 className="mt-2 text-2xl font-semibold">{app.job?.title ?? "Application"}</h1>
        <div className="text-sm text-gray-500">{app.organization?.name ?? "—"}</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4 bg-white">
          <div className="font-medium mb-2">Status</div>
          <div className="inline-flex items-center text-xs rounded border border-gray-200 px-2 py-1 bg-white text-gray-700">
            {app.status ?? "Applied"}
          </div>
        </div>

        <div className="rounded-lg border p-4 bg-white">
          <div className="font-medium mb-2">Timestamps</div>
          <div className="text-sm text-gray-700">
            <div><span className="text-gray-500">Applied:</span> {app.createdAt ? new Date(app.createdAt).toLocaleString() : "—"}</div>
            <div><span className="text-gray-500">Last update:</span> {app.updatedAt ? new Date(app.updatedAt).toLocaleString() : "—"}</div>
          </div>
        </div>
      </div>

      {app.job?.descriptionMd ? (
        <div className="rounded-lg border p-4 bg-white">
          <div className="font-medium mb-2">Job Description</div>
          <pre className="whitespace-pre-wrap text-sm text-gray-800">{app.job.descriptionMd}</pre>
        </div>
      ) : null}

      {(app.resumeFilename || app.resumeS3Key) ? (
        <div className="rounded-lg border p-4 bg-white">
          <div className="font-medium mb-2">Submitted Resume</div>
          <div className="text-sm text-gray-700">
            <div>Filename: {app.resumeFilename ?? "—"}</div>
            <div>MIME: {app.resumeMime ?? "—"}</div>
            <div>Size: {app.resumeSize ? `${app.resumeSize} bytes` : "—"}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
