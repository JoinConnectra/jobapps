import { absoluteUrl } from "@/lib/url";

export default async function ApplicationDetail({ params }: { params: { id: string } }) {
  const url = await absoluteUrl(`/api/student/applications/${params.id}`);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return <div className="text-sm text-red-600">Failed to load application.</div>;
  const app = await res.json();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{app.job?.title}</h1>
      <div className="text-sm text-muted-foreground">{app.organization?.name}</div>
      <div className="rounded-lg border p-4">
        <div className="font-medium mb-2">Status</div>
        <div className="text-sm">{app.status ?? "Pending"}</div>
      </div>
    </div>
  );
}
