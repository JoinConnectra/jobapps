// src/components/student/StudentTopbar.tsx
"use client";

import { Bell, Search } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function StudentTopbar() {
  const router = useRouter();
  const [q, setQ] = useState("");

  return (
    <div className="flex h-14 items-center justify-between gap-4 px-6">
      {/* Search: match company console input height, radius and icon spacing */}
      <form
        className="relative w-full max-w-lg"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) router.push(`/student/jobs?q=${encodeURIComponent(q.trim())}`);
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none ring-0 focus:border-primary"
          placeholder="Search jobs, companies…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </form>

      {/* Right-side actions: same density as employer console */}
      <div className="flex items-center gap-3">
        <button
          className="inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm hover:bg-muted/70"
          type="button"
          onClick={() => router.push("/student/applications")}
        >
          My Applications
        </button>

        <button
          className="inline-flex size-9 items-center justify-center rounded-md border hover:bg-muted/70"
          aria-label="Notifications"
          type="button"
        >
          <Bell className="size-4" />
        </button>

        {/* Avatar group: matches employer console spacing */}
        <div className="flex items-center gap-2 rounded-md border px-2 py-1">
          <Image
            src="/avatar.png"
            alt="User"
            width={20}
            height={20}
            className="rounded-full"
          />
          <span className="text-sm">Student</span>
        </div>
      </div>
    </div>
  );
}
