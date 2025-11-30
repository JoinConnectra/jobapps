"use client";

import { BarChart3, Brain, Calendar, Command, Users, Activity, FileText, User, MessageSquare, CheckCircle2, Mail, Code, FileQuestion, CaseSensitive } from "lucide-react";
import { cn } from "@/lib/utils";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { ChartContainer, ChartConfig } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";
import { Globe } from "@/components/ui/globe";
import { AvatarCircles } from "@/components/ui/avatar-circles";
import { ActionSearchBar } from "@/components/ui/action-search-bar";
import { AnimatedList } from "@/components/ui/animated-list";
import { ATSProgressBars } from "@/components/ui/ats-progress-bars";

// Mock data for analytics area chart visualization
const analyticsChartData = [
  { month: "Jan", applications: 45, hires: 8 },
  { month: "Feb", applications: 62, hires: 12 },
  { month: "Mar", applications: 78, hires: 15 },
  { month: "Apr", applications: 55, hires: 10 },
  { month: "May", applications: 89, hires: 18 },
  { month: "Jun", applications: 72, hires: 14 },
];

const analyticsChartConfig: ChartConfig = {
  applications: {
    label: "Applications",
    color: "hsl(142, 35%, 35%)",
  },
  hires: {
    label: "Hires",
    color: "hsl(142, 35%, 25%)",
  },
};

// Mock pipeline stages
const pipelineStages = [
  { stage: "Applied", count: 120, color: "bg-blue-500" },
  { stage: "Screening", count: 45, color: "bg-yellow-500" },
  { stage: "Interview", count: 28, color: "bg-orange-500" },
  { stage: "Offer", count: 12, color: "bg-purple-500" },
  { stage: "Hired", count: 8, color: "bg-green-500" },
];

const features = [
  {
    Icon: BarChart3,
    name: "Analytics Dashboard",
    description: "Track hiring metrics, pipeline performance, and time-to-hire with comprehensive analytics and visual insights.",
    href: "/dashboard/kpi/insights",
    cta: "View analytics",
    className: "col-span-3 lg:col-span-2",
    background: (
      <div className="absolute inset-0 left-0 [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)]">
        <ChartContainer
          config={analyticsChartConfig}
          className="h-full w-full opacity-60 group-hover:opacity-80 transition-opacity duration-300"
        >
          <AreaChart
            data={analyticsChartData}
            margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fillApplications" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(142, 35%, 35%)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(142, 35%, 35%)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillHires" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="hsl(142, 35%, 25%)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="hsl(142, 35%, 25%)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: "rgba(0,0,0,0.4)" }}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={false}
              domain={[0, 100]}
              width={0}
            />
            <Area
              dataKey="applications"
              type="natural"
              fill="url(#fillApplications)"
              stroke="hsl(142, 35%, 35%)"
              strokeWidth={2}
              stackId="a"
            />
            <Area
              dataKey="hires"
              type="natural"
              fill="url(#fillHires)"
              stroke="hsl(142, 35%, 25%)"
              strokeWidth={2}
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </div>
    ),
  },
  {
    Icon: Brain,
    name: "ATS Scoring System",
    description: "AI-powered resume analysis with intelligent matching, skill extraction, and candidate ranking.",
    href: "/dashboard/jobs",
    cta: "See scoring",
    className: "col-span-3 lg:col-span-1",
    background: (
      <div className="absolute inset-0 flex items-center justify-center [mask-image:linear-gradient(to_top,transparent_30%,#000_100%)]">
        <ATSProgressBars />
      </div>
    ),
  },
  {
    Icon: Calendar,
    name: "Interview Scheduling",
    description: "Seamless calendar integration for scheduling interviews with automatic email invites and reminders.",
    href: "/dashboard/interviews",
    cta: "Schedule now",
    className: "col-span-3 lg:col-span-1",
    background: (
      <CalendarComponent
        mode="single"
        selected={new Date(2024, 5, 15)}
        className="absolute top-4 right-0 origin-top scale-75 rounded-md border [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)] transition-all duration-300 ease-out group-hover:scale-90"
      />
    ),
  },
  {
    Icon: Command,
    name: "Command Palette",
    description: "Navigate your dashboard instantly with keyboard shortcuts. Access jobs, applications, analytics, and more with ⌘K.",
    href: "/dashboard",
    cta: "Try ⌘K",
    className: "col-span-3 lg:col-span-1",
    background: (
      <div className="absolute inset-0 flex items-start justify-center pt-4 [mask-image:linear-gradient(to_top,transparent_5%,#000_100%)] opacity-80 group-hover:opacity-95 transition-opacity duration-300">
        <div className="scale-90 origin-top">
          <ActionSearchBar autoShow={true} />
        </div>
      </div>
    ),
  },
  {
    Icon: FileText,
    name: "Assessment Builder",
    description: "Create tailored assessments ranging from coding challenges to MCQ tests and case studies to evaluate candidates at any stage.",
    href: "/dashboard",
    cta: "Create assessment",
    className: "col-span-3 lg:col-span-1",
    background: (
      <div className="absolute inset-0 flex flex-wrap items-start gap-1 p-2 [mask-image:linear-gradient(to_top,transparent_20%,#000_100%)]">
        {[
          // Interleaved categories for variety
          { title: "Python Algorithms", Icon: Code, bgColor: "#124559", borderColor: "#124559", iconColor: "#124559" },
          { title: "Technical Knowledge", Icon: FileQuestion, bgColor: "#386641", borderColor: "#386641", iconColor: "#386641" },
          { title: "Business Analysis", Icon: CaseSensitive, bgColor: "#9e2a2b", borderColor: "#9e2a2b", iconColor: "#9e2a2b" },
          { title: "React Component", Icon: Code, bgColor: "#124559", borderColor: "#124559", iconColor: "#124559" },
          { title: "Problem Solving", Icon: FileQuestion, bgColor: "#386641", borderColor: "#386641", iconColor: "#386641" },
          { title: "Project Scenario", Icon: CaseSensitive, bgColor: "#9e2a2b", borderColor: "#9e2a2b", iconColor: "#9e2a2b" },
          { title: "Data Structures", Icon: Code, bgColor: "#124559", borderColor: "#124559", iconColor: "#124559" },
          { title: "Industry Standards", Icon: FileQuestion, bgColor: "#386641", borderColor: "#386641", iconColor: "#386641" },
          { title: "Real-world Problem", Icon: CaseSensitive, bgColor: "#9e2a2b", borderColor: "#9e2a2b", iconColor: "#9e2a2b" },
          { title: "API Integration", Icon: Code, bgColor: "#124559", borderColor: "#124559", iconColor: "#124559" },
          { title: "Best Practices", Icon: FileQuestion, bgColor: "#386641", borderColor: "#386641", iconColor: "#386641" },
          { title: "Strategic Planning", Icon: CaseSensitive, bgColor: "#9e2a2b", borderColor: "#9e2a2b", iconColor: "#9e2a2b" },
          { title: "System Design", Icon: Code, bgColor: "#124559", borderColor: "#124559", iconColor: "#124559" },
          { title: "Core Concepts", Icon: FileQuestion, bgColor: "#386641", borderColor: "#386641", iconColor: "#386641" },
          { title: "Client Case", Icon: CaseSensitive, bgColor: "#9e2a2b", borderColor: "#9e2a2b", iconColor: "#9e2a2b" },
          { title: "Frontend Challenge", Icon: Code, bgColor: "#124559", borderColor: "#124559", iconColor: "#124559" },
          { title: "Quick Assessment", Icon: FileQuestion, bgColor: "#386641", borderColor: "#386641", iconColor: "#386641" },
          { title: "Scenario Analysis", Icon: CaseSensitive, bgColor: "#9e2a2b", borderColor: "#9e2a2b", iconColor: "#9e2a2b" },
        ].map((assessment, idx) => (
          <div
            key={idx}
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] transition-all duration-300 group-hover:scale-105"
            style={{
              animationDelay: `${idx * 30}ms`,
              backgroundColor: `${assessment.bgColor}15`,
              borderColor: `${assessment.borderColor}40`,
            }}
          >
            <assessment.Icon className="h-2.5 w-2.5" style={{ color: assessment.iconColor }} />
            <span className="font-medium text-gray-900 whitespace-nowrap">{assessment.title}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    Icon: Users,
    name: "Team Collaboration",
    description: "Invite team members to collaborate on hiring decisions with multi-user viewing and shared applicant access.",
    href: "/dashboard",
    cta: "Invite team",
    className: "col-span-3 lg:col-span-2",
    background: (
      <div className="absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)]">
        <div className="relative h-full w-full flex flex-col items-center justify-center">
          <div className="relative w-full h-full flex items-center justify-center">
            <Globe className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-70 group-hover:opacity-90 transition-opacity duration-300 scale-75" />
          </div>
          <div className="pointer-events-none absolute inset-0 h-full bg-[radial-gradient(circle_at_50%_200%,rgba(61,106,74,0.15),rgba(255,255,255,0))]" />
        </div>
      </div>
    ),
  },
  {
    Icon: Activity,
    name: "Activity Timeline",
    description: "Track team collaboration, candidate interactions, and hiring decisions in one unified feed.",
    href: "/dashboard",
    cta: "View timeline",
    className: "col-span-3 lg:col-span-1",
    background: (
      <AnimatedList className="absolute top-4 right-2 h-[300px] w-full scale-75 border-none [mask-image:linear-gradient(to_top,transparent_10%,#000_100%)] transition-all duration-300 ease-out group-hover:scale-90 flex flex-col gap-2 p-2">
        {[
          { Icon: User, text: "Sarah reviewed application", time: "5m", color: "text-blue-500" },
          { Icon: MessageSquare, text: "Team discussion started", time: "12m", color: "text-purple-500" },
          { Icon: CheckCircle2, text: "Status updated", time: "1h", color: "text-green-500" },
          { Icon: Mail, text: "Email sent to candidate", time: "2h", color: "text-orange-500" },
        ].map((activity, idx) => (
          <div
            key={idx}
            className={cn(
              "relative mx-auto min-h-fit w-full max-w-[400px] cursor-pointer overflow-hidden rounded-2xl p-3",
              "transition-all duration-200 ease-in-out hover:scale-[103%]",
              "bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
              "transform-gpu dark:bg-transparent dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset] dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)]"
            )}
          >
            <div className="flex flex-row items-center gap-3">
              <div
                className={cn(
                  "flex size-8 items-center justify-center rounded-xl",
                  activity.color.replace("text-", "bg-").replace("-500", "-100")
                )}
              >
                <activity.Icon className={cn("h-4 w-4", activity.color)} />
              </div>
              <div className="flex flex-col overflow-hidden">
                <div className="flex flex-row items-center text-sm font-medium whitespace-pre dark:text-white">
                  <span className="text-xs sm:text-sm">{activity.text}</span>
                  <span className="mx-1">·</span>
                  <span className="text-xs text-gray-500">{activity.time} ago</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </AnimatedList>
    ),
  },
];

export default function FeaturesBentoGrid() {
  return (
    <section className="relative py-12 md:py-16 lg:py-20 xl:py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="font-display font-semibold text-[#1A1A1A] text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-3 md:mb-4">
              Everything you need to hire smarter
            </h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-500 max-w-2xl mx-auto px-4 sm:px-0">
              Powerful features designed to streamline your hiring process and help you find the best talent faster.
            </p>
          </div>
          <BentoGrid>
            {features.map((feature, idx) => (
              <BentoCard key={idx} {...feature} />
            ))}
          </BentoGrid>
        </div>
      </div>
    </section>
  );
}

