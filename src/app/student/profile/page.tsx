import { absoluteUrl } from "@/lib/url";

export default async function StudentProfilePage() {
  const url = await absoluteUrl("/api/student/profile");
  const res = await fetch(url, { cache: "no-store" });
  const me = res.ok ? await res.json() : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <a href="/student" className="hover:text-gray-700">Student</a>
          <span>/</span>
          <span className="text-gray-900 font-medium">Profile</span>
        </nav>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">Profile</h1>
      </div>

      <form action="/api/student/profile" method="post" className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
        {/* Name */}
        <div className="grid gap-2">
          <label className="text-sm text-gray-700">Full name</label>
          <input
            className="border border-gray-300 bg-white rounded px-3 py-2 text-gray-900"
            name="name"
            defaultValue={me?.name ?? ""}
            placeholder="e.g., Ayesha Khan"
          />
        </div>

        {/* University / Program */}
        <div className="grid gap-2">
          <label className="text-sm text-gray-700">University / Program</label>
          <input
            className="border border-gray-300 bg-white rounded px-3 py-2 text-gray-900"
            name="program"
            defaultValue={me?.program ?? ""}
            placeholder="e.g., LUMS — BSCS"
          />
        </div>

        {/* Grad year */}
        <div className="grid gap-2">
          <label className="text-sm text-gray-700">Graduation Year (optional)</label>
          <input
            className="border border-gray-300 bg-white rounded px-3 py-2 text-gray-900"
            name="gradYear"
            type="number"
            min="1950"
            max="2100"
            defaultValue={me?.gradYear ?? ""}
            placeholder="e.g., 2026"
          />
        </div>

        {/* Phone */}
        <div className="grid gap-2">
          <label className="text-sm text-gray-700">Phone (PK)</label>
          <input
            className="border border-gray-300 bg-white rounded px-3 py-2 text-gray-900"
            name="phone"
            defaultValue={me?.phone ?? ""}
            placeholder="+92 3xx xxxxxxx or 03xx xxxxxxx"
          />
        </div>

        <button className="rounded-md border border-gray-200 bg-white px-4 py-2 text-gray-900 hover:bg-[#F5F1E8]/60">
          Save
        </button>
      </form>
    </div>
  );
}
