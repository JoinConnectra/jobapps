export default async function StudentDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Welcome back</h1>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">Applications</div><div className="text-2xl font-bold">0</div></div>
        <div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">Saved Jobs</div><div className="text-2xl font-bold">0</div></div>
        <div className="rounded-lg border p-4"><div className="text-sm text-muted-foreground">Interviews</div><div className="text-2xl font-bold">0</div></div>
      </div>
    </div>
  );
}
