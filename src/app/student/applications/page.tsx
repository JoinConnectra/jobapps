import { absoluteUrl } from "@/lib/url";

export default async function ApplicationsPage() {
  const url = await absoluteUrl("/api/student/applications");
  const res = await fetch(url, { cache: "no-store" });
  const apps = res.ok ? await res.json() : [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">My Applications</h1>
      <div className="rounded-lg border divide-y">
        {apps.length === 0 && (
          <div className="p-6 text-sm text-muted-foreground">No applications yet.</div>
        )}
        {apps.map((a: any) => (
          <a
            key={a.id}
            href={`/student/applications/${a.id}`}
            className="flex items-center justify-between p-4 hover:bg-muted/30"
          >
            <div>
              <div className="font-medium">{a.job?.title}</div>
              <div className="text-sm text-muted-foreground">
                {a.organization?.name} • {new Date(a.updatedAt).toLocaleString()}
              </div>
            </div>
            <span className="text-xs rounded border px-2 py-1">
              {a.status ?? "Pending"}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
