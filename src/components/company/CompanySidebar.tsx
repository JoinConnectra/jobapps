'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Bell, Briefcase, ListChecks, CalendarDays, BarChartIcon,
  HelpCircle, Search, UserPlus, LogOut, Settings
} from 'lucide-react';
import { useCommandPalette } from '@/hooks/use-command-palette';

export default function CompanySidebar({
  org,
  user,
  onSignOut,
  active = '',
}: {
  org: { id: number; name: string } | null;
  user: { name?: string | null };
  onSignOut: () => void;
  active?: 'activities' | 'jobs' | 'assessments' | 'events' | 'kpi';
}) {
  const router = useRouter();
  const { open } = useCommandPalette();

  const item = (label: string, icon: React.ReactNode, href: string, key: typeof active) => (
    <Button
      key={href}
      variant="ghost"
      onClick={() => router.push(href)}
      className={`w-full justify-start ${
        active === key ? 'bg-[#F5F1E8] text-gray-900' : 'text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900'
      }`}
    >
      {icon}
      <span className="ml-3">{label}</span>
    </Button>
  );

  return (
    <aside className="w-64 bg-[#FEFEFA] border-r border-gray-200 flex flex-col h-screen sticky top-0">
      <div className="p-6">
        <div className="text-xl font-display font-bold text-gray-900 mb-6">
          {org?.name || 'forshadow'}
        </div>

        <Button
          onClick={() => router.push('/dashboard/jobs?create=1')}
          className="w-full mb-6 bg-[#F5F1E8] text-gray-900 hover:bg-[#E8E0D5] border-0"
        >
          + Create a Job
        </Button>

        <nav className="space-y-1">
          {item('Activities', <Bell className="w-4 h-4" />, '/dashboard', 'activities')}
          {item('Jobs', <Briefcase className="w-4 h-4" />, '/dashboard/jobs', 'jobs')}
          <Button
            variant="ghost"
            className={`w-full justify-start ${
              active === 'assessments'
                ? 'bg-[#F5F1E8] text-gray-900'
                : 'text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900'
            }`}
            disabled={!org?.id}
            title={!org?.id ? 'Select or create an organization first' : 'Assessments'}
            onClick={() => org?.id && router.push(`/dashboard/organizations/${org.id}/assessments`)}
          >
            <ListChecks className="w-4 h-4" />
            <span className="ml-3">Assessments</span>
          </Button>
          {item('Events', <CalendarDays className="w-4 h-4" />, '/dashboard/events', 'events')}
          {item('KPI · Insights', <BarChartIcon className="w-4 h-4" />, '/dashboard/kpi/insights', 'kpi')}
        </nav>
      </div>

      <div className="mt-auto p-6 border-t border-gray-200">
        <div className="space-y-3">
          <Button variant="ghost" className="w-full justify-start text-gray-500 text-sm" onClick={open}>
            <Search className="w-4 h-4 mr-3" />
            Search <span className="ml-auto text-xs">⌘K</span>
          </Button>
          <Button variant="ghost" className="w-full justify-start text-gray-500 text-sm">
            <HelpCircle className="w-4 h-4 mr-3" />
            Help & Support
          </Button>
          <Button variant="ghost" className="w-full justify-start text-gray-500 text-sm">
            <UserPlus className="w-4 h-4 mr-3" />
            Invite people
          </Button>
          <Button variant="ghost" className="w-full justify-start text-gray-500 text-sm" onClick={onSignOut}>
            <LogOut className="w-4 h-4 mr-3" />
            Log out
          </Button>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
            <span className="text-white text-sm font-medium">{user?.name?.charAt(0)}</span>
          </div>
          <div className="flex-1 text-sm font-medium text-gray-900">{user?.name}</div>
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-8 w-8 text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
