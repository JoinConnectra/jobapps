export default function ApplicationRow({ app }:{ app:any }){
  return (
    <a href={`/student/applications/${app.id}`} className="flex items-center justify-between p-4 hover:bg-muted/30">
      <div>
        <div className="font-medium">{app.job?.title}</div>
        <div className="text-sm text-muted-foreground">{app.organization?.name} • {app.updatedAt}</div>
      </div>
      <span className="text-xs rounded border px-2 py-1">{app.status ?? "Pending"}</span>
    </a>
  );
}
