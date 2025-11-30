// /src/app/dashboard/kpi/insights/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import {
  Briefcase,
  Users,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Settings,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
} from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import CommandPalette from "@/components/CommandPalette";
import SettingsModal from "@/components/SettingsModal";
import CompanySidebar from "@/components/company/CompanySidebar";
import { useCommandPalette } from "@/hooks/use-command-palette";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { ChartConfig } from "@/components/ui/chart";

// Chart color configuration using green theme
const chartConfig: ChartConfig = {
  applicants: {
    label: "Applicants",
    color: "hsl(var(--chart-green-1))",
  },
  interviewed: {
    label: "Interviewed",
    color: "hsl(var(--chart-green-2))",
  },
  offers: {
    label: "Offers",
    color: "hsl(var(--chart-green-3))",
  },
  hired: {
    label: "Hired",
    color: "hsl(var(--chart-green-4))",
  },
  count: {
    label: "Count",
    color: "hsl(var(--chart-green-1))",
  },
  rate: {
    label: "Rate",
    color: "hsl(var(--chart-green-2))",
  },
  matchScore: {
    label: "Match Score",
    color: "hsl(var(--chart-green-3))",
  },
  avgDays: {
    label: "Avg Days",
    color: "hsl(var(--chart-green-4))",
  },
};

// Fallback colors if CSS variables aren't available
const GREEN_COLORS = [
  "#3d6a4a",
  "#4a7c59",
  "#5a8f6a",
  "#6ba27b",
  "#7cb58c",
  "#8dc89d",
];

interface DashboardData {
  overview: {
    totalOpenJobs: number;
    totalApplicantsThisMonth: number;
    medianTimeToHire: number | null;
    offerAcceptanceRate: number;
    activeCandidates: number;
    funnelConversion: {
      applicants: number;
      interviewed: number;
      offers: number;
      hired: number;
      conversionPercent: number;
    };
    sourceBreakdown: Array<{ source: string; count: number }>;
    teamActivity: Array<{ userId: number; userName: string; count: number }>;
  };
  pipeline: {
    stageCounts: Array<{ stage: string; count: number }>;
    timeInStage: Array<{ stage: string; avgDays: number }>;
    bottlenecks: Array<{ stage: string; avgDays: number }>;
  };
  jobPerformance: Array<{
    jobId: number;
    jobTitle: string;
    applicantsCount: number;
    qualifiedApplicantsPercent: number;
    avgMatchScore: number | null;
    timeToFill: number | null;
    offerAcceptance: number;
    skillsMatch: Array<{ skill: string; matchPercent: number }>;
  }>;
  applicationsOverTime: Array<{
    date: string;
    total: number;
    byJob: Record<string, number>;
  }>;
}

export default function KPIInsightsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const {
    isOpen: isCommandPaletteOpen,
    open: openCommandPalette,
    close: closeCommandPalette,
  } = useCommandPalette();

  const [org, setOrg] = useState<{ id: number; name: string; logoUrl?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user) {
      loadOrg();
    }
  }, [session?.user]);

  useEffect(() => {
    if (org?.id) {
      fetchAnalytics();
    }
  }, [org?.id]);

  // Set first job as selected when data loads
  useEffect(() => {
    const jobPerformance = data?.jobPerformance || [];
    if (jobPerformance.length > 0 && !selectedJobId) {
      setSelectedJobId(jobPerformance[0].jobId);
    }
  }, [data?.jobPerformance, selectedJobId]);

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) {
      toast.error(error.code);
    } else {
      localStorage.removeItem("bearer_token");
      router.push("/");
    }
  };

  const loadOrg = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const resp = await fetch("/api/organizations?mine=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const orgs = await resp.json();
        if (Array.isArray(orgs) && orgs.length > 0) {
          setOrg({ id: orgs[0].id, name: orgs[0].name, logoUrl: orgs[0].logoUrl });
        }
      }
    } catch (e) {
      console.error("Failed to load org:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    if (!org?.id) return;
    try {
      setFetching(true);
      const token = localStorage.getItem("bearer_token");

      const resp = await fetch(`/api/analytics/dashboard?orgId=${org.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load analytics");
      }

      const analyticsData = await resp.json();
      setData(analyticsData);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to load analytics");
    } finally {
      setFetching(false);
    }
  };

  const overview = data?.overview;
  const pipeline = data?.pipeline;
  const jobPerformance = data?.jobPerformance || [];
  const applicationsOverTime = data?.applicationsOverTime || [];

  // Helper to calculate percentage change
  const calculateChange = (current: number, previous: number): { value: string; type: "positive" | "negative" | "neutral" } => {
    if (previous === 0) {
      return current > 0 ? { value: "+100%", type: "positive" } : { value: "0%", type: "neutral" };
    }
    const change = ((current - previous) / previous) * 100;
    const rounded = Math.abs(change) < 0.01 ? 0 : change;
    return {
      value: `${rounded >= 0 ? "+" : ""}${rounded.toFixed(2)}%`,
      type: rounded > 0 ? "positive" : rounded < 0 ? "negative" : "neutral",
    };
  };

  // Calculate changes for overview stats using real previous period data from API
  const overviewChanges = useMemo(() => {
    if (!overview || !overview.previousPeriod) return {};
    
    return {
      thisMonth: calculateChange(
        overview.totalApplicantsThisMonth,
        overview.previousPeriod.totalApplicantsThisMonth
      ),
      active: calculateChange(
        overview.activeCandidates,
        overview.previousPeriod.activeCandidates
      ),
      acceptance: calculateChange(
        overview.offerAcceptanceRate,
        overview.previousPeriod.offerAcceptanceRate
      ),
    };
  }, [overview]);

  // State hooks must be declared before useMemo hooks that use them
  const [activeChart, setActiveChart] = useState<string>("total");
  const [timeView, setTimeView] = useState<"daily" | "monthly" | "yearly">("daily");

  // Prepare data for interactive chart - get unique job titles
  const uniqueJobTitles = useMemo(() => {
    const jobs = new Set<string>();
    applicationsOverTime.forEach((item) => {
      Object.keys(item.byJob).forEach((job) => jobs.add(job));
    });
    return Array.from(jobs).slice(0, 5); // Limit to top 5 jobs for clarity
  }, [applicationsOverTime]);

  // Transform data for chart based on time view
  const chartData = useMemo(() => {
    if (timeView === "daily") {
      return applicationsOverTime.map((item) => {
        const dataPoint: Record<string, number | string> = {
          date: item.date,
          total: item.total,
        };
        uniqueJobTitles.forEach((job) => {
          dataPoint[job] = item.byJob[job] || 0;
        });
        return dataPoint;
      });
    }

    // Group by month or year
    const grouped = new Map<string, { total: number; byJob: Record<string, number> }>();

    applicationsOverTime.forEach((item) => {
      const date = new Date(item.date);
      let key: string;

      if (timeView === "monthly") {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      } else {
        // yearly
        key = String(date.getFullYear());
      }

      if (!grouped.has(key)) {
        grouped.set(key, { total: 0, byJob: {} });
      }

      const group = grouped.get(key)!;
      group.total += item.total;
      uniqueJobTitles.forEach((job) => {
        group.byJob[job] = (group.byJob[job] || 0) + (item.byJob[job] || 0);
      });
    });

    return Array.from(grouped.entries())
      .map(([date, data]) => {
        const dataPoint: Record<string, number | string> = {
          date,
          total: data.total,
        };
        uniqueJobTitles.forEach((job) => {
          dataPoint[job] = data.byJob[job] || 0;
        });
        return dataPoint;
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [applicationsOverTime, uniqueJobTitles, timeView]);

  // Helper function to create safe gradient IDs from job titles
  const getGradientId = (job: string) => {
    return `fill-${job.replace(/[^a-zA-Z0-9]/g, "-")}`;
  };

  // Chart config for interactive chart
  const interactiveChartConfig: ChartConfig = useMemo(() => ({
    total: {
      label: "Total Applications",
      color: "hsl(142, 35%, 25%)", // Darker green
    },
    ...uniqueJobTitles.reduce((acc, job, index) => {
      acc[job] = {
        label: job.length > 20 ? job.substring(0, 20) + "..." : job,
        color: GREEN_COLORS[index % GREEN_COLORS.length],
      };
      return acc;
    }, {} as Record<string, { label: string; color: string }>),
  }), [uniqueJobTitles]);

  const total = useMemo(() => {
    const totals: Record<string, number> = { total: 0 };
    uniqueJobTitles.forEach((job) => {
      totals[job] = 0;
    });

    chartData.forEach((item) => {
      totals.total += item.total as number;
      uniqueJobTitles.forEach((job) => {
        totals[job] += (item[job] as number) || 0;
      });
    });

    return totals;
  }, [chartData, uniqueJobTitles]);

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.user) return null;

  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
      <CompanySidebar
        org={org}
        user={session?.user || null}
        onSignOut={handleSignOut}
        onOpenSettings={() => setIsSettingsOpen(true)}
        active="kpi"
      />

      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <nav className="flex items-center gap-2 text-xs sm:text-sm mb-1">
                  <Link
                    href="/dashboard"
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Dashboard
                  </Link>
                  <span className="text-gray-400">&gt;</span>
                  <span className="text-gray-900 font-medium">Analytics</span>
                </nav>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAnalytics}
                disabled={fetching}
              >
                <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 mr-2 ${fetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {fetching && !data ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !data ? (
              <Card>
                <CardContent className="py-20 text-center">
                  <p className="text-gray-500">No data available. Try refreshing.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* SECTION 1: Overview Snapshot */}
                <section className="mb-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Overview</h2>
                  <div className="grid grid-cols-2 gap-px rounded-xl bg-border sm:grid-cols-3 lg:grid-cols-6">
                    {[
                      {
                        label: "Open Jobs",
                        value: overview?.totalOpenJobs || 0,
                      },
                      {
                        label: "This Month",
                        value: overview?.totalApplicantsThisMonth || 0,
                        change: overviewChanges.thisMonth,
                      },
                      {
                        label: "Time to Hire",
                        value: overview?.medianTimeToHire
                          ? `${Math.round(overview.medianTimeToHire)}d`
                          : "—",
                      },
                      {
                        label: "Acceptance",
                        value: overview?.offerAcceptanceRate
                          ? `${overview.offerAcceptanceRate.toFixed(1)}%`
                          : "0%",
                        change: overviewChanges.acceptance,
                      },
                      {
                        label: "Active",
                        value: overview?.activeCandidates || 0,
                        change: overviewChanges.active,
                      },
                      {
                        label: "Conversion",
                        value: overview?.funnelConversion.conversionPercent.toFixed(1) || "0",
                        suffix: "%",
                      },
                    ].map((stat, index) => (
                      <Card
                        key={stat.label}
                        className={cn(
                          "rounded-none border-0 shadow-none py-0",
                          index === 0 && "rounded-l-xl",
                          index === 5 && "rounded-r-xl"
                        )}
                      >
                        <CardContent className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 p-3 sm:p-4">
                          <div className="text-xs font-medium text-muted-foreground">
                            {stat.label}
                          </div>
                          {stat.change && (
                            <div
                              className={cn(
                                "text-xs font-medium",
                                stat.change.type === "positive"
                                  ? "text-green-800 dark:text-green-400"
                                  : stat.change.type === "negative"
                                  ? "text-red-800 dark:text-red-400"
                                  : "text-muted-foreground"
                              )}
                            >
                              {stat.change.value}
                            </div>
                          )}
                          <div className="w-full flex-none text-2xl font-medium tracking-tight text-foreground">
                            {stat.value}
                            {stat.suffix}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>

                {/* SECTION 2: Applications Over Time - Interactive Chart */}
                <section className="mb-6">
                  <Card className="py-0">
                    <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
                      <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
                        <CardTitle>Applications Over Time</CardTitle>
                        <CardDescription>
                          Showing applications for the last 6 months
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-3 px-6 pt-4 pb-3 sm:!py-0">
                        <Select value={timeView} onValueChange={(value) => setTimeView(value as "daily" | "monthly" | "yearly")}>
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex flex-wrap">
                        {["total", ...uniqueJobTitles].map((key) => {
                          const chartKey = key;
                          const isActive = activeChart === chartKey;
                          return (
                            <button
                              key={chartKey}
                              data-active={isActive}
                              className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-4 py-3 text-left even:border-l sm:border-t-0 sm:border-l sm:px-6 sm:py-4 min-w-[120px]"
                              onClick={() => setActiveChart(chartKey)}
                            >
                              <span className="text-muted-foreground text-xs">
                                {interactiveChartConfig[chartKey]?.label || chartKey}
                              </span>
                              <span className="text-base leading-none font-bold sm:text-2xl">
                                {total[chartKey]?.toLocaleString() || 0}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </CardHeader>
                    <CardContent className="px-2 sm:p-6">
                      {chartData.length === 0 ? (
                        <div className="h-[250px] flex items-center justify-center text-sm text-gray-400">
                          No application data available
                        </div>
                      ) : (
                        <ChartContainer
                          config={interactiveChartConfig}
                          className="aspect-auto h-[250px] w-full"
                        >
                          <AreaChart
                            accessibilityLayer
                            data={chartData}
                            margin={{
                              left: 12,
                              right: 12,
                            }}
                          >
                            <defs>
                              <linearGradient id="fillTotal" x1="0" y1="0" x2="0" y2="1">
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
                              {uniqueJobTitles.map((job, index) => {
                                const color = GREEN_COLORS[index % GREEN_COLORS.length];
                                const gradientId = getGradientId(job);
                                return (
                                  <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop
                                      offset="5%"
                                      stopColor={color}
                                      stopOpacity={0.8}
                                    />
                                    <stop
                                      offset="95%"
                                      stopColor={color}
                                      stopOpacity={0.1}
                                    />
                                  </linearGradient>
                                );
                              })}
                            </defs>
                            <CartesianGrid vertical={false} />
                            <XAxis
                              dataKey="date"
                              tickLine={false}
                              axisLine={false}
                              tickMargin={8}
                              minTickGap={32}
                              tick={{ fontSize: 10 }}
                              tickFormatter={(value) => {
                                if (timeView === "yearly") {
                                  return value;
                                } else if (timeView === "monthly") {
                                  // Format: "2024-01" -> "Jan 2024"
                                  const [year, month] = value.split("-");
                                  const date = new Date(parseInt(year), parseInt(month) - 1);
                                  return date.toLocaleDateString("en-US", {
                                    month: "short",
                                    year: "numeric",
                                  });
                                } else {
                                  // daily
                                  const date = new Date(value);
                                  return date.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  });
                                }
                              }}
                            />
                            <ChartTooltip
                              cursor={false}
                              content={
                                <ChartTooltipContent
                                  labelFormatter={(value) => {
                                    if (timeView === "yearly") {
                                      return value;
                                    } else if (timeView === "monthly") {
                                      const [year, month] = value.split("-");
                                      const date = new Date(parseInt(year), parseInt(month) - 1);
                                      return date.toLocaleDateString("en-US", {
                                        month: "long",
                                        year: "numeric",
                                      });
                                    } else {
                                      const date = new Date(value);
                                      return date.toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      });
                                    }
                                  }}
                                  indicator="dot"
                                />
                              }
                            />
                            {activeChart === "total" ? (
                              <Area
                                dataKey="total"
                                type="natural"
                                fill="url(#fillTotal)"
                                stroke="hsl(142, 35%, 25%)"
                                stackId="a"
                              />
                            ) : (
                              <>
                                <Area
                                  dataKey="total"
                                  type="natural"
                                  fill="url(#fillTotal)"
                                  stroke="hsl(142, 35%, 25%)"
                                  stackId="a"
                                  opacity={0.3}
                                />
                                <Area
                                  dataKey={activeChart}
                                  type="natural"
                                  fill={`url(#${getGradientId(activeChart)})`}
                                  stroke={interactiveChartConfig[activeChart]?.color || GREEN_COLORS[0]}
                                  stackId="a"
                                />
                              </>
                            )}
                            <ChartLegend content={<ChartLegendContent />} />
                          </AreaChart>
                        </ChartContainer>
                      )}
                    </CardContent>
                  </Card>
                </section>

                {/* SECTION 3: Pipeline & Funnel Analytics */}
                <section className="mb-6">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Pipeline & Funnel</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Stage Counts Bar Chart */}
                    <Card className="p-4">
                      <CardHeader className="p-0 pb-3">
                        <CardTitle className="text-sm font-semibold">By Stage</CardTitle>
                        <CardDescription className="text-xs">Pipeline distribution</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ChartContainer config={chartConfig} className="h-[200px] sm:h-[220px]">
                          <BarChart data={pipeline?.stageCounts || []} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" fill={GREEN_COLORS[0]} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>

                    {/* Time in Stage Line Chart */}
                    <Card className="p-4">
                      <CardHeader className="p-0 pb-3">
                        <CardTitle className="text-sm font-semibold">Time in Stage</CardTitle>
                        <CardDescription className="text-xs">Days per stage</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ChartContainer config={chartConfig} className="h-[200px] sm:h-[220px]">
                          <LineChart data={pipeline?.timeInStage || []} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="stage" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Line
                              type="monotone"
                              dataKey="avgDays"
                              stroke={GREEN_COLORS[0]}
                              strokeWidth={2}
                              dot={{ r: 3 }}
                            />
                          </LineChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>

                    {/* Bottlenecks Bar Chart */}
                    <Card className="p-4">
                      <CardHeader className="p-0 pb-3">
                        <CardTitle className="text-sm font-semibold">Bottlenecks</CardTitle>
                        <CardDescription className="text-xs">Longest avg time</CardDescription>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ChartContainer config={chartConfig} className="h-[200px] sm:h-[220px]">
                          <BarChart data={pipeline?.bottlenecks || []} layout="vertical" margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis type="number" tick={{ fontSize: 10 }} />
                            <YAxis dataKey="stage" type="category" width={60} tick={{ fontSize: 10 }} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="avgDays" fill={GREEN_COLORS[1]} radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  </div>
                </section>

                {/* SECTION 4: Job Performance Insights */}
                <section className="mb-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Job Performance</h2>
                    {jobPerformance.length > 0 && (
                      <Select
                        value={selectedJobId?.toString() || ""}
                        onValueChange={(value) => setSelectedJobId(Number(value))}
                      >
                        <SelectTrigger className="w-full sm:w-[250px]">
                          <SelectValue placeholder="Select a job" />
                        </SelectTrigger>
                        <SelectContent>
                          {jobPerformance.map((job) => (
                            <SelectItem key={job.jobId} value={job.jobId.toString()}>
                              {job.jobTitle}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {jobPerformance.length === 0 ? (
                    <Card className="p-6">
                      <CardContent className="p-0 text-center">
                        <p className="text-sm text-gray-500">No job performance data available.</p>
                      </CardContent>
                    </Card>
                  ) : !selectedJobId ? (
                    <Card className="p-6">
                      <CardContent className="p-0 text-center">
                        <p className="text-sm text-gray-500">Select a job to view performance insights.</p>
                      </CardContent>
                    </Card>
                  ) : (
                    (() => {
                      const job = jobPerformance.find((j) => j.jobId === selectedJobId);
                      if (!job) return null;

                      return (
                        <div className="space-y-3">
                          <Card className="p-4">
                            <CardHeader className="p-0 pb-3">
                              <CardTitle className="text-base font-semibold">{job.jobTitle}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Applicants</div>
                                  <div className="text-lg font-bold">{job.applicantsCount}</div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Qualified</div>
                                  <div className="text-lg font-bold">
                                    {job.qualifiedApplicantsPercent.toFixed(1)}%
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Match Score</div>
                                  <div className="text-lg font-bold">
                                    {job.avgMatchScore ? job.avgMatchScore.toFixed(0) : "—"}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Time to Fill</div>
                                  <div className="text-lg font-bold">
                                    {job.timeToFill ? `${Math.round(job.timeToFill)}d` : "—"}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* AI Match Score Radial Chart */}
                                {job.avgMatchScore !== null && (
                                  <Card className="p-3">
                                    <CardHeader className="p-0 pb-2">
                                      <CardTitle className="text-xs font-semibold">Match Score</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                      <ChartContainer config={chartConfig} className="h-[160px] sm:h-[180px]">
                                        <RadialBarChart
                                          innerRadius="40%"
                                          outerRadius="70%"
                                          data={[
                                            {
                                              name: "Match Score",
                                              value: job.avgMatchScore,
                                              fill: GREEN_COLORS[0],
                                            },
                                          ]}
                                          startAngle={90}
                                          endAngle={-270}
                                        >
                                          <RadialBar dataKey="value" cornerRadius={4} />
                                          <ChartTooltip content={<ChartTooltipContent />} />
                                        </RadialBarChart>
                                      </ChartContainer>
                                    </CardContent>
                                  </Card>
                                )}

                                {/* Skills Match Radar Chart */}
                                {job.skillsMatch.length > 0 && (
                                  <Card className="p-3">
                                    <CardHeader className="p-0 pb-2">
                                      <CardTitle className="text-xs font-semibold">Skills Match</CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                      <ChartContainer config={chartConfig} className="h-[160px] sm:h-[180px]">
                                        <RadarChart data={job.skillsMatch} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                                          <PolarGrid />
                                          <PolarAngleAxis dataKey="skill" tick={{ fontSize: 9 }} />
                                          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} />
                                          <Radar
                                            name="Match %"
                                            dataKey="matchPercent"
                                            stroke={GREEN_COLORS[0]}
                                            fill={GREEN_COLORS[0]}
                                            fillOpacity={0.6}
                                          />
                                          <ChartTooltip content={<ChartTooltipContent />} />
                                        </RadarChart>
                                      </ChartContainer>
                                    </CardContent>
                                  </Card>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })()
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      </main>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        orgId={org?.id}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        organization={
          org
            ? {
                id: org.id,
                name: org.name,
                slug: "",
                type: "company",
                plan: "free",
                seatLimit: 5,
                createdAt: "",
                updatedAt: "",
              }
            : null
        }
      />
    </div>
  );
}
