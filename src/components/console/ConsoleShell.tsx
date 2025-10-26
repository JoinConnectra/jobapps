// src/components/console/ConsoleShell.tsx
"use client";

import type { ReactNode } from "react";

/**
 * Mirrors employer console chrome 1:1:
 * - min-h-screen bg-[#FEFEFA] flex
 * - Sidebar: w-64 bg-[#FEFEFA] border-r border-gray-200 flex flex-col h-screen sticky top-0
 * - Main: flex-1 bg-[#FEFEFA] overflow-y-auto
 * - Inner: p-8 > max-w-6xl
 * Employer pages put headers/breadcrumbs inside the inner container, so we do the same.
 */
export function ConsoleShell({
  sidebar,
  children,
  topbar,
}: {
  sidebar: ReactNode;
  children: ReactNode;
  topbar?: ReactNode; // optional; employer console typically inlines headers instead
}) {
  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#FEFEFA] border-r border-gray-200 flex flex-col h-screen sticky top-0">
        {sidebar}
      </aside>

      {/* Main */}
      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto">
        {/* Optional sticky bar (not used by employer pages, but available if needed) */}
        {topbar ? (
          <div className="sticky top-0 z-10 border-b border-gray-200 bg-[#FEFEFA]/90 backdrop-blur">
            {topbar}
          </div>
        ) : null}

        <div className="p-8">
          <div className="max-w-6xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
