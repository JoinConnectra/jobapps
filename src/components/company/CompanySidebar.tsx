'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Bell,
  Briefcase,
  BarChartIcon,
  Search,
  HelpCircle,
  UserPlus,
  LogOut,
  CalendarDays,
  ListChecks,
  Settings,
} from 'lucide-react';
import { useCommandPalette } from '@/hooks/use-command-palette';

interface CompanySidebarProps {
  org: { id: number; name: string; logoUrl?: string | null } | null;
  user: { name?: string | null };
  onSignOut: () => void;
  onOpenSettings?: () => void;
  active?: 'activities' | 'jobs' | 'assessments' | 'events' | 'kpi';
}

export default function CompanySidebar({
  org,
  user,
  onSignOut,
  onOpenSettings,
  active = '',
}: CompanySidebarProps) {
  const router = useRouter();
  const { open: openCommandPalette } = useCommandPalette();

  return (
    <aside className="w-64 bg-[#FEFEFA] border-r border-gray-200 flex flex-col h-screen sticky top-0">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          {org?.logoUrl ? (
            <img
              src={org.logoUrl}
              alt={`${org.name} logo`}
              className="w-7 h-7 rounded object-cover flex-shrink-0"
              onError={(e) => {
                console.error("CompanySidebar: Failed to load logo image:", org.logoUrl);
                e.currentTarget.style.display = 'none';
              }}
              onLoad={() => {
                console.log("CompanySidebar: Logo image loaded successfully:", org.logoUrl);
              }}
            />
          ) : null}
          <div className="text-xl font-display font-bold text-gray-900">
            {org?.name || 'forshadow'}
          </div>
        </div>

        {/* CTA to create a job */}
        <Button
          onClick={() => router.push('/dashboard/jobs?create=1')}
          className="w-full mb-6 bg-[#F5F1E8] text-gray-900 hover:bg-[#E8E0D5] border-0"
        >
          + Create a Job
        </Button>

        {/* Primary navigation */}
        <nav className="space-y-1">
          <Button
            variant="ghost"
            className={`w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900 ${
              active === 'activities' ? 'bg-[#F5F1E8] text-gray-900' : ''
            }`}
            onClick={() => router.push('/dashboard')}
          >
            <Bell className="w-4 h-4 mr-3" />
            Activities
          </Button>

          <Button
            variant="ghost"
            className={`w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900 ${
              active === 'jobs' ? 'bg-[#F5F1E8] text-gray-900' : ''
            }`}
            onClick={() => router.push('/dashboard/jobs')}
          >
            <Briefcase className="w-4 h-4 mr-3" />
            Jobs
          </Button>

          {/* Assessments (org scoped). Disabled until org id is known. */}
          <Button
            variant="ghost"
            className={`w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900 ${
              active === 'assessments' ? 'bg-[#F5F1E8] text-gray-900' : ''
            }`}
            disabled={!org?.id}
            title={!org?.id ? 'Select or create an organization first' : 'Assessments'}
            onClick={() =>
              org?.id && router.push(`/dashboard/organizations/${org.id}/assessments`)
            }
          >
            <ListChecks className="w-4 h-4 mr-3" />
            Assessments
          </Button>

          {/* Events - Commented out for now */}
          {/* <Button
            variant="ghost"
            className={`w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900 ${
              active === 'events' ? 'bg-[#F5F1E8] text-gray-900' : ''
            }`}
            onClick={() => router.push('/dashboard/events')}
          >
            <CalendarDays className="w-4 h-4 mr-3" />
            Events
          </Button> */}

          <Button
            variant="ghost"
            className={`w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900 ${
              active === 'kpi' ? 'bg-[#F5F1E8] text-gray-900' : ''
            }`}
            onClick={() => router.push('/dashboard/kpi/insights')}
          >
            <BarChartIcon className="w-4 h-4 mr-3" />
            KPI · Insights
          </Button>
        </nav>
      </div>

      {/* Footer actions: search/shortcuts/help/invite/logout */}
      <div className="mt-auto p-6 border-t border-gray-200">
        <div className="space-y-3">
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-500 text-sm"
            onClick={openCommandPalette}
          >
            <Search className="w-4 h-4 mr-3" />
            Search
            <span className="ml-auto text-xs">⌘K</span>
          </Button>
          <Button variant="ghost" className="w-full justify-start text-gray-500 text-sm">
            <HelpCircle className="w-4 h-4 mr-3" />
            Help & Support
          </Button>
          <Button variant="ghost" className="w-full justify-start text-gray-500 text-sm">
            <UserPlus className="w-4 h-4 mr-3" />
            Invite people
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-500 text-sm"
            onClick={onSignOut}
          >
            <LogOut className="w-4 h-4 mr-3" />
            Log out
          </Button>
        </div>

        {/* Current user pill */}
        <div className="mt-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1 text-sm font-medium text-gray-900">{user?.name || 'User'}</div>
          {onOpenSettings && (
            <Button
              variant="ghost"
              size="sm"
              className="p-1 h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              title="Settings"
              onClick={onOpenSettings}
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </aside>
  );
}
