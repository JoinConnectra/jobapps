"use client";

/**
 * DashboardNav.tsx
 * -----------------
 * Purpose:
 *   Global top-level dashboard navigation used across the app (e.g., in your dashboard shell/header).
 *   This component renders a horizontal nav with icon + label for each section and highlights
 *   the active route based on the current pathname.
 *
 * How it works:
 *   - `navItems` defines the tabs (title, href, icon).
 *   - `usePathname()` is used to determine which tab is active (exact match or subpath).
 *   - `cn` merges Tailwind classes to apply active/hover styles.
 *
 * What was added:
 *   - A new "Assessments" tab pointing to `/dashboard/assessments` with the ListChecks icon.
 *
 * Where to use:
 *   - Import and render <DashboardNav /> inside your dashboard layout/header so it appears on all dashboard pages.
 *   - If you currently duplicate sidebars in individual pages, consider centralizing them in a shared layout
 *     (e.g., `src/app/dashboard/layout.tsx`) and include this nav so updates propagate everywhere.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  Users,
  BarChart3,
  Settings,
  ListChecks, // NEW: icon for Assessments
} from "lucide-react";

// Central definition for top-level dashboard tabs.
// Add/remove items here and the UI updates everywhere this component is used.
const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Organizations",
    href: "/dashboard/organizations",
    icon: Building2,
  },
  {
    title: "Jobs",
    href: "/dashboard/jobs",
    icon: Briefcase,
  },
  // NEW: Assessments lives alongside Jobs as a sibling section under /dashboard
  {
    title: "Assessments",
    href: "/dashboard/assessments",
    icon: ListChecks,
  },
  {
    title: "Candidates",
    href: "/dashboard/candidates",
    icon: Users,
  },
  {
    title: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {navItems.map((item) => {
        // Render the icon component from the item
        const Icon = item.icon;

        // Active if we are exactly on item.href OR on a nested route beneath it
        // Example: /dashboard/jobs/123 keeps "Jobs" highlighted
        const isActive =
          pathname === item.href || pathname?.startsWith(item.href + "/");

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="w-4 h-4" />
            {/* Hide labels on small screens to keep the header tidy */}
            <span className="hidden md:inline">{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}
