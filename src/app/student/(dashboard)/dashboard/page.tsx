export default async function StudentDashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header (breadcrumb-style) */}
      <div>
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <a href="/student" className="hover:text-gray-700">Student</a>
          <span>/</span>
          <span className="text-gray-900 font-medium">Dashboard</span>
        </nav>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">Welcome back</h1>
      </div>

      {/* Cards, mirror employer density */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500">Applications</div>
          <div className="text-2xl font-bold text-gray-900">0</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500">Saved Jobs</div>
          <div className="text-2xl font-bold text-gray-900">0</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500">Interviews</div>
          <div className="text-2xl font-bold text-gray-900">0</div>
        </div>
      </div>
    </div>
  );
}
