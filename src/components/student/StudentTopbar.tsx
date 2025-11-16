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
    <div className="flex items-center justify-between gap-4 px-8 py-3 bg-[#FEFEFA]/90 border-b border-gray-200">
      {/* Search (company-style density) */}
      <form
        className="relative w-full max-w-lg"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) {
            router.push(`/student/jobs?q=${encodeURIComponent(q.trim())}`);
          }
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

      {/* Right-side actions – match company density */}
      <div className="flex items-center gap-3">
        <button
          className="inline-flex h-9 items-center justify-center rounded-md border px-3 text-sm hover:bg-muted/70 bg-white"
          type="button"
          onClick={() => router.push("/student/applications")}
        >
          My Applications
        </button>

        <button
          className="inline-flex size-9 items-center justify-center rounded-md border bg-white hover:bg-muted/70"
          aria-label="Notifications"
          type="button"
        >
          <Bell className="size-4" />
        </button>

        {/* Avatar pill – compact like company footer pill */}
        <div className="flex items-center gap-2 rounded-md border bg-white px-2 py-1">
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
