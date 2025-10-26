import Link from "next/link";

export default function ApplicationRow({ app }: { app: any }) {
  return (
    <Link
      href={`/student/applications/${app.id}`}
      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-lg border"
    >
      <div>
        <div className="font-medium">{app.job?.title}</div>
        <div className="text-sm text-muted-foreground">
          {app.organization?.name ?? "—"} • {new Date(app.updatedAt).toLocaleString()}
        </div>
      </div>
      <span className="text-xs rounded border px-2 py-1">{app.status ?? "Pending"}</span>
    </Link>
  );
}
