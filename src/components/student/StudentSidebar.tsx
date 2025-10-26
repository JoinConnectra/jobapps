"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Briefcase,
  FileText,
  GraduationCap,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";
import clsx from "clsx";

const mainNav = [
  { href: "/student/dashboard", label: "Dashboard", icon: Home },
  { href: "/student/jobs", label: "Jobs", icon: Briefcase },
  { href: "/student/applications", label: "Applications", icon: FileText },
  { href: "/student/profile", label: "Profile", icon: GraduationCap },
];

const secondary = [
  { href: "/student/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help", icon: HelpCircle },
  { href: "/logout", label: "Log out", icon: LogOut },
];

export default function StudentSidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex h-full flex-col">
      {/* Brand (matches employer) */}
      <div className="p-6">
        <div className="text-xl font-display font-bold text-gray-900 mb-6">
          JobHunt
        </div>

        {/* Primary navigation */}
        <div className="space-y-1">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "w-full flex items-center gap-3 text-sm px-3 py-2 rounded",
                  active
                    ? "bg-[#F5F1E8] text-gray-900"
                    : "text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Secondary */}
        <div className="mt-6 space-y-1">
          {secondary.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "w-full flex items-center gap-3 text-sm px-3 py-2 rounded",
                  active
                    ? "bg-[#F5F1E8] text-gray-900"
                    : "text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Footer user pill (employer-like footer strip) */}
      <div className="mt-auto p-6 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white text-sm font-medium">S</span>
          </div>
          <div className="flex-1 text-sm font-medium text-gray-900">Student</div>
        </div>
      </div>
    </div>
  );
}
