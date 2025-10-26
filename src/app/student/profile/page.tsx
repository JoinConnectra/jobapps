export const dynamic = "force-dynamic";

import Link from "next/link";
import { headers } from "next/headers";
import { absoluteUrl } from "@/lib/url";

async function loadMe() {
  const url = await absoluteUrl("/api/student/profile");

  // ✅ forward cookies so the API can read the current session
  const h = await headers();
  const cookie = h.get("cookie") ?? "";

  const res = await fetch(url, {
    cache: "no-store",
    headers: { cookie },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Profile API ${res.status}: ${text || "Failed"}`);
  }

  return res.json();
}

export default async function StudentProfilePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  let me: any = null;
  let error: string | null = null;

  try {
    me = await loadMe();
  } catch (e: any) {
    error = e?.message || "Failed to load profile.";
  }

  const saved = searchParams?.saved === "1";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/student" className="hover:text-gray-700">Student</Link>
          <span>/</span>
          <span className="text-gray-900 font-medium">Profile</span>
        </nav>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">Profile</h1>
      </div>

      {/* Alerts */}
      {saved && (
        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Saved successfully.
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Form */}
      <form
        action="/api/student/profile"
        method="post"
        className="space-y-4 rounded-lg border border-gray-200 bg-white p-4"
      >
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

        {/* (Optional) University ID if you hook a selector later */}
        <input type="hidden" name="universityId" value={me?.universityId ?? ""} />

        {/* Grad year */}
        <div className="grid gap-2">
          <label className="text-sm text-gray-700">Graduation Year (optional)</label>
          <input
            className="border border-gray-300 bg-white rounded px-3 py-2 text-gray-900"
            name="gradYear"
            type="number"
            min={1950}
            max={2100}
            defaultValue={me?.gradYear ?? ""}
            placeholder="e.g., 2026"
          />
        </div>

        {/* Phone */}
        <div className="grid gap-2">
          <label className="text-sm text-gray-700">Phone</label>
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
