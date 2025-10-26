import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const protocol = h.get("x-forwarded-proto") || "http";
  const base = `${protocol}://${host}`;

  // ✅ Fetch logged-in student profile
  const profileRes = await fetch(`${base}/api/student/profile`, {
    cache: "no-store",
    headers: { cookie: h.get("cookie") ?? "" },
  });

  if (!profileRes.ok) {
    return (
      <div className="p-8 text-center text-red-600">
        Failed to load dashboard — please log in again.
      </div>
    );
  }

  const me = await profileRes.json();

  // ✅ Fetch only this student's applications
  const appsRes = await fetch(`${base}/api/applications?mine=1`, {
    cache: "no-store",
    headers: { cookie: h.get("cookie") ?? "" },
  });
  const applications = appsRes.ok ? await appsRes.json() : [];

  // ✅ Fetch saved jobs (if same structure, add ?mine=1 too if required)
  const savedRes = await fetch(`${base}/api/student/saved`, {
    cache: "no-store",
    headers: { cookie: h.get("cookie") ?? "" },
  });
  const saved = savedRes.ok ? await savedRes.json() : [];

  // ✅ Derive interview count
  const interviews = applications.filter((a: any) => a.stage === "Interview");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <a href="/student" className="hover:text-gray-700">
            Student
          </a>
          <span>/</span>
          <span className="text-gray-900 font-medium">Dashboard</span>
        </nav>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">
          Welcome back, {me?.name || "Student"}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Track your applications, saved jobs, and interviews.
        </p>
      </div>

      {/* Statistic cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <StatCard label="Applications" value={applications.length} />
        <StatCard label="Saved Jobs" value={saved.length} />
        <StatCard label="Interviews" value={interviews.length} />
      </div>

      {/* Quick summary section */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 mt-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Profile Overview
        </h2>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>
            <strong>Name:</strong> {me.name || "Not provided"}
          </li>
          <li>
            <strong>Program:</strong> {me.program || "Not provided"}
          </li>
          <li>
            <strong>Graduation Year:</strong> {me.gradYear || "Not provided"}
          </li>
          <li>
            <strong>Profile Visibility:</strong>{" "}
            {me.isPublic ? (
              <span className="text-emerald-600 font-medium">Public</span>
            ) : (
              <span className="text-gray-500">Private</span>
            )}
          </li>
        </ul>
      </div>
    </div>
  );
}

/* -------------------- Reusable small card -------------------- */
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 text-center shadow-sm">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-3xl font-bold text-gray-900">{value}</div>
    </div>
  );
}
