// /src/app/dashboard/kpi/insights/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, authClient } from "@/lib/auth-client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  BarChart as BarChartIcon,
  Bell,
  Briefcase,
  ListChecks,
  LogOut,
  Search,
  HelpCircle,
  UserPlus,
  Download,
  RefreshCw,
  Filter,
  TrendingUp,
  Building2,
  MapPin,
} from "lucide-react";
import CommandPalette from "@/components/CommandPalette";
import { useCommandPalette } from "@/hooks/use-command-palette";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type RowCity = { city: string; count: number };
type RowUni = { university: string; count: number };

export default function KPIInsightsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const {
    isOpen: isCommandPaletteOpen,
    open: openCommandPalette,
    close: closeCommandPalette,
  } = useCommandPalette();

  const [org, setOrg] = useState<{ id: number; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);

  const [byCity, setByCity] = useState<RowCity[]>([]);
  const [byUniversity, setByUniversity] = useState<RowUni[]>([]);
  const [total, setTotal] = useState<number>(0);

  // Controls
  const [range, setRange] = useState<string>("30d");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [topN, setTopN] = useState<"5" | "10" | "20" | "all">("10");
  const [sortBy, setSortBy] = useState<"count_desc" | "count_asc" | "alpha">(
    "count_desc"
  );

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.id, range, fromDate, toDate]);

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
          setOrg(orgs[0]);
        }
      }
    } catch (e) {
      console.error("Failed to load org:", e);
    } finally {
      setLoading(false);
    }
  };

  const computeRange = () => {
    if (range === "all") return {};
    const now = new Date();
    if (range === "30d") {
      const f = new Date(now);
      f.setDate(f.getDate() - 30);
      return { from: f.toISOString(), to: now.toISOString() };
    }
    if (range === "90d") {
      const f = new Date(now);
      f.setDate(f.getDate() - 90);
      return { from: f.toISOString(), to: now.toISOString() };
    }
    if (range === "ytd") {
      const f = new Date(now.getFullYear(), 0, 1);
      return { from: f.toISOString(), to: now.toISOString() };
    }
    if (range === "custom" && fromDate && toDate) {
      try {
        const f = new Date(fromDate);
        const t = new Date(toDate);
        if (f.toString() !== "Invalid Date" && t.toString() !== "Invalid Date") {
          return { from: f.toISOString(), to: t.toISOString() };
        }
      } catch {}
    }
    return {};
  };

  const fetchAnalytics = async () => {
    if (!org?.id) return;
    try {
      setFetching(true);
      const token = localStorage.getItem("bearer_token");
      const { from, to } = computeRange();

      const qs = new URLSearchParams({ orgId: String(org.id) });
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      qs.set("limit", "100");

      const resp = await fetch(`/api/analytics/applications?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load analytics");
      }

      const data = await resp.json();
      setByCity(Array.isArray(data.byCity) ? data.byCity : []);
      setByUniversity(Array.isArray(data.byUniversity) ? data.byUniversity : []);
      setTotal(Number(data.total || 0));
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to load analytics");
    } finally {
      setFetching(false);
    }
  };

  // Sorting + TopN
  const sortRows = <T extends { [k: string]: any }>(
    rows: T[],
    labelKey: string
  ) => {
    const copy = [...rows];
    if (sortBy === "alpha") {
      copy.sort((a, b) =>
        String(a[labelKey] || "").localeCompare(String(b[labelKey] || ""))
      );
    } else if (sortBy === "count_asc") {
      copy.sort((a, b) => Number(a.count) - Number(b.count));
    } else {
      copy.sort((a, b) => Number(b.count) - Number(a.count));
    }
    return copy;
  };

  const topSlice = <T,>(rows: T[]) => {
    if (topN === "all") return rows;
    const n = Number(topN);
    return rows.slice(0, n);
  };

  const cityData = useMemo(
    () => topSlice(sortRows(byCity, "city")),
    [byCity, sortBy, topN]
  );
  const uniData = useMemo(
    () => topSlice(sortRows(byUniversity, "university")),
    [byUniversity, sortBy, topN]
  );

  // CSV export
  const toCSV = (rows: Record<string, any>[], headers: string[]) => {
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => {
            const val = r[h] ?? "";
            const s = String(val).replace(/"/g, '""');
            return /[",\n]/.test(s) ? `"${s}"` : s;
          })
          .join(",")
      ),
    ].join("\n");
    return csv;
  };

  const downloadCSV = (kind: "city" | "university") => {
    const rows =
      kind === "city"
        ? cityData.map((r) => ({ city: r.city, count: r.count }))
        : uniData.map((r) => ({ university: r.university, count: r.count }));
    const headers = kind === "city" ? ["city", "count"] : ["university", "count"];
    const csv = toCSV(rows, headers);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      kind === "city" ? "applicants_by_city.csv" : "applicants_by_university.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const isEmptyAll =
    total === 0 || (byCity.length === 0 && byUniversity.length === 0);

  // Shared lighter palette
  const BAR_FILL = "#9CA3AF"; // Tailwind gray-400
  const AXIS_STROKE = "#D1D5DB"; // gray-300
  const TICK_FILL = "#6B7280"; // gray-500
  const GRID_STROKE = "#E5E7EB"; // gray-200
  const BAR_SIZE = 12; // thinner bars

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
      {/* Sidebar */}
      <aside className="w-64 bg-[#FEFEFA] border-r border-gray-200 flex flex-col h-screen sticky top-0">
        <div className="p-6">
          <div className="text-xl font-display font-bold text-gray-900 mb-6">
            {org?.name || "Your organization"}
          </div>

          <Button
            onClick={() => router.push("/dashboard/jobs?create=1")}
            className="w-full mb-6 bg-[#F5F1E8] text-gray-900 hover:bg-[#E8E0D5] border-0"
          >
            + Create a Job
          </Button>

          <nav className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900"
              onClick={() => router.push("/dashboard")}
            >
              <Bell className="w-4 h-4 mr-3" />
              Activities
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900"
              onClick={() => router.push("/dashboard/jobs")}
            >
              <Briefcase className="w-4 h-4 mr-3" />
              Jobs
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900"
              onClick={() => router.push(`/dashboard/organizations/${org?.id}/assessments`)}
            >
              <ListChecks className="w-4 h-4 mr-3" />
              Assessments
            </Button>

            <Button
              variant="ghost"
              className="w-full justify-start text-gray-900 bg-[#F5F1E8]"
              onClick={() => router.push("/dashboard/kpi/insights")}
            >
              <BarChartIcon className="w-4 h-4 mr-3" />
              KPI · Insights
            </Button>
          </nav>
        </div>

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
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4 mr-3" />
              Log out
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto">
        <div className="p-8">
          <div className="max-w-6xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-4 mb-8">
              <nav className="flex items-center gap-2 text-sm">
                <Link
                  href="/dashboard"
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Dashboard
                </Link>
                <span className="text-gray-400">&gt;</span>
                <span className="text-gray-900 font-medium">KPI · Insights</span>
              </nav>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    Applicants Insights
                    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                      <Filter className="w-3 h-3" /> Filters
                    </span>
                  </h2>
                  <p className="text-sm text-gray-500">See where candidates come from</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Select value={range} onValueChange={setRange}>
                    <SelectTrigger className="w-[170px]">
                      <SelectValue placeholder="Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All time</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="ytd">Year to date</SelectItem>
                      <SelectItem value="custom">Custom…</SelectItem>
                    </SelectContent>
                  </Select>

                  {range === "custom" && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                      />
                      <span className="text-gray-400">to</span>
                      <Input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                      />
                    </div>
                  )}

                  <Select value={topN} onValueChange={(v) => setTopN(v as any)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Top N" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">Top 5</SelectItem>
                      <SelectItem value="10">Top 10</SelectItem>
                      <SelectItem value="20">Top 20</SelectItem>
                      <SelectItem value="all">All</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="count_desc">Count ↓</SelectItem>
                      <SelectItem value="count_asc">Count ↑</SelectItem>
                      <SelectItem value="alpha">Alphabetical</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" onClick={fetchAnalytics} disabled={fetching}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${fetching ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Total Applicants</div>
                  <div className="text-3xl font-semibold">{total}</div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Top City</div>
                  <div className="text-lg font-medium">
                    {cityData[0]?.city ?? "—"} {cityData[0] ? `(${cityData[0].count})` : ""}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-blue-600" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Top University</div>
                  <div className="text-lg font-medium">
                    {uniData[0]?.university ?? "—"} {uniData[0] ? `(${uniData[0].count})` : ""}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>

            {/* Empty state */}
            {isEmptyAll ? (
              <div className="bg-white rounded-xl shadow-sm p-10 text-center">
                <div className="text-lg font-medium text-gray-900 mb-2">No data yet</div>
                <p className="text-sm text-gray-500 max-w-md mx-auto">
                  When applicants start flowing in, you’ll see where they’re coming from by
                  city and university. Try expanding the date range or check back later.
                </p>
                <div className="mt-6 flex justify-center">
                  <Button variant="outline" onClick={fetchAnalytics}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-6">
                {/* By City */}
                <div className="bg-white rounded-xl shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Applicants by City</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadCSV("city")}
                        className="text-gray-600"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        CSV
                      </Button>
                    </div>
                  </div>

                  <div className="h-72">
                    {fetching ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={cityData}
                          layout="vertical"
                          margin={{ top: 8, right: 16, bottom: 8, left: 16 }}
                          barCategoryGap={8}
                        >
                          <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                          <XAxis type="number" stroke={AXIS_STROKE} tick={{ fill: TICK_FILL }} />
                          <YAxis
                            dataKey="city"
                            type="category"
                            width={110}
                            stroke={AXIS_STROKE}
                            tick={{ fill: TICK_FILL }}
                          />
                          <Tooltip />
                          <Bar
                            dataKey="count"
                            fill={BAR_FILL}
                            barSize={BAR_SIZE}
                            radius={[4, 4, 4, 4]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500">
                          <th className="py-2">City</th>
                          <th className="py-2">Applicants</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cityData.map((r) => (
                          <tr key={r.city} className="border-t">
                            <td className="py-2">{r.city}</td>
                            <td className="py-2">{r.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* By University */}
                <div className="bg-white rounded-xl shadow-sm p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Applicants by University</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadCSV("university")}
                        className="text-gray-600"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        CSV
                      </Button>
                    </div>
                  </div>

                  <div className="h-72">
                    {fetching ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={uniData}
                          layout="vertical"
                          margin={{ top: 8, right: 16, bottom: 8, left: 16 }}
                          barCategoryGap={8}
                        >
                          <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                          <XAxis type="number" stroke={AXIS_STROKE} tick={{ fill: TICK_FILL }} />
                          <YAxis
                            dataKey="university"
                            type="category"
                            width={140}
                            stroke={AXIS_STROKE}
                            tick={{ fill: TICK_FILL }}
                          />
                          <Tooltip />
                          <Bar
                            dataKey="count"
                            fill={BAR_FILL}
                            barSize={BAR_SIZE}
                            radius={[4, 4, 4, 4]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500">
                          <th className="py-2">University</th>
                          <th className="py-2">Applicants</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uniData.map((r) => (
                          <tr key={r.university} className="border-t">
                            <td className="py-2">{r.university}</td>
                            <td className="py-2">{r.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        orgId={org?.id}
      />
    </div>
  );
}
