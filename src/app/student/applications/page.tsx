import { absoluteUrl } from "@/lib/url";

async function getApplications() {
  const url = await absoluteUrl("/api/student/applications");
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export default async function ApplicationsPage() {
  const apps = await getApplications();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <a href="/student" className="hover:text-gray-700">Student</a>
          <span>/</span>
          <span className="text-gray-900 font-medium">Applications</span>
        </nav>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">My Applications</h1>
      </div>

      {/* List */}
      {apps.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-500">
          No applications yet.
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white divide-y">
          {apps.map((a: any) => (
            <a
              key={a.id}
              href={`/student/applications/${a.id}`}
              className="flex items-center justify-between p-4 hover:bg-[#F5F1E8]/40 transition-colors"
            >
              <div>
                <div className="font-medium text-gray-900">{a.job?.title}</div>
                <div className="text-sm text-gray-500">
                  {a.organization?.name ?? "—"} • {new Date(a.updatedAt).toLocaleString()}
                </div>
              </div>
              <span className="text-xs rounded border border-gray-200 px-2 py-1 bg-white text-gray-700">
                {a.status ?? "Pending"}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
