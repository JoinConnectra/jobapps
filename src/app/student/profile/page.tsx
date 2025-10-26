import { absoluteUrl } from "@/lib/url";

export default async function StudentProfilePage() {
  const url = await absoluteUrl("/api/student/profile");
  const res = await fetch(url, { cache: "no-store" });
  const me = res.ok ? await res.json() : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Profile</h1>

      <form action="/api/student/profile" method="post" className="space-y-4 rounded-lg border p-4">
        {/* Name */}
        <div className="grid gap-2">
          <label className="text-sm">Full name</label>
          <input
            className="border rounded px-3 py-2"
            name="name"
            defaultValue={me?.name ?? ""}
            placeholder="e.g., Ayesha Khan"
          />
        </div>

        {/* University / Program (stored as program in student_profiles) */}
        <div className="grid gap-2">
          <label className="text-sm">University / Program</label>
          <input
            className="border rounded px-3 py-2"
            name="program"
            defaultValue={me?.program ?? ""}
            placeholder="e.g., LUMS — BSCS"
          />
        </div>

        {/* Optional: Graduation year */}
        <div className="grid gap-2">
          <label className="text-sm">Graduation Year (optional)</label>
          <input
            className="border rounded px-3 py-2"
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
          <label className="text-sm">Phone (PK)</label>
          <input
            className="border rounded px-3 py-2"
            name="phone"
            defaultValue={me?.phone ?? ""}
            placeholder="+92 3xx xxxxxxx or 03xx xxxxxxx"
          />
        </div>

        <button className="rounded-md border px-4 py-2">Save</button>
      </form>
    </div>
  );
}
