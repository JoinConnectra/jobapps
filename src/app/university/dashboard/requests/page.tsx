"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import UniversityDashboardShell from "@/components/university/UniversityDashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, RefreshCw, Trash2, ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RequestRow = {
  id: number;
  companyOrgId: number;
  companyName: string;
  status: string; // "pending" | "approved" | "rejected" | "removed"
  createdAt?: string | null;

  // Enriched from organizations + employerProfiles
  logoUrl?: string | null;
  aboutCompany?: string | null;
  websiteUrl?: string | null;
  industry?: string | null;
  locations?: unknown | null;
};

type TabValue = "requests" | "partners" | "rejected" | "removed";
type Action = "approve" | "reject" | "remove" | "reconsider";

export default function RequestsPage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabValue>("requests");
  const [industryFilter, setIndustryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"recent" | "name">("recent");

  // For inline expansion under each partner row
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(
    null,
  );

  // Resolve university orgId (same logic used elsewhere in the portal)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch("/api/organizations?mine=true", {
          cache: "no-store",
        });
        if (!resp.ok) return;
        const orgs = await resp.json();
        const uni = Array.isArray(orgs)
          ? orgs.find((o: any) => o.type === "university")
          : null;
        if (!cancelled && uni?.id) {
          setOrgId(Number(uni.id));
        }
      } catch (err) {
        console.error("Failed to load university org:", err);
        toast.error("Failed to load your university profile.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const resp = await fetch(`/api/university/requests?orgId=${orgId}`, {
        cache: "no-store",
      });
      if (!resp.ok) {
        toast.error("Failed to load company relationships.");
        return;
      }
      const data = await resp.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch requests:", err);
      toast.error("Something went wrong while loading requests.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    load();
  }, [orgId, load]);

  const act = async (id: number, action: Action) => {
    try {
      const resp = await fetch(
        `/api/university/requests/${id}/${action}`,
        { method: "POST" },
      );
      if (!resp.ok) {
        toast.error(`Failed to ${action} request.`);
        return;
      }

      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== id) return r;
          if (action === "approve") return { ...r, status: "approved" };
          if (action === "reject") return { ...r, status: "rejected" };
          if (action === "remove") return { ...r, status: "removed" };
          if (action === "reconsider") return { ...r, status: "pending" };
          return r;
        }),
      );

      // If we removed/rejected the currently expanded partner, collapse it
      if (
        selectedPartnerId === id &&
        (action === "remove" || action === "reject")
      ) {
        setSelectedPartnerId(null);
      }

      if (action === "approve") {
        toast.success("Company approved as a recruiting partner.");
      } else if (action === "reject") {
        toast.success("Request rejected.");
      } else if (action === "remove") {
        toast.success("Partnership removed. Company no longer has access.");
      } else if (action === "reconsider") {
        toast.success("Request moved back to pending for reconsideration.");
      }
    } catch (err) {
      console.error(`Failed to ${action} request:`, err);
      toast.error(`Failed to ${action} request.`);
    }
  };

  const pendingRequests = useMemo(
    () => rows.filter((r) => r.status === "pending"),
    [rows],
  );

  const approvedPartners = useMemo(
    () => rows.filter((r) => r.status === "approved"),
    [rows],
  );

  const rejectedCompanies = useMemo(
    () => rows.filter((r) => r.status === "rejected"),
    [rows],
  );

  const removedCompanies = useMemo(
    () => rows.filter((r) => r.status === "removed"),
    [rows],
  );

  const totalPending = pendingRequests.length;
  const totalPartners = approvedPartners.length;
  const totalRejected = rejectedCompanies.length;
  const totalRemoved = removedCompanies.length;
  const hasVisibleData =
    totalPending + totalPartners + totalRejected + totalRemoved > 0;

  const industries = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.industry) set.add(r.industry);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const applyFilters = (items: RequestRow[]) => {
    let list = items;

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((r) =>
        (r.companyName || "").toLowerCase().includes(q),
      );
    }

    if (industryFilter !== "all") {
      list = list.filter(
        (r) => (r.industry || "Other") === industryFilter,
      );
    }

    // Sorting
    list = [...list];
    if (sortBy === "name") {
      list.sort((a, b) =>
        (a.companyName || "").localeCompare(b.companyName || ""),
      );
    } else {
      // recent: by createdAt desc; fallback to id
      list.sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (aTime === 0 && bTime === 0) {
          return b.id - a.id;
        }
        return bTime - aTime;
      });
    }

    return list;
  };

  const filteredPending = useMemo(
    () => applyFilters(pendingRequests),
    [pendingRequests, search, industryFilter, sortBy],
  );

  const filteredPartners = useMemo(
    () => applyFilters(approvedPartners),
    [approvedPartners, search, industryFilter, sortBy],
  );

  const filteredRejected = useMemo(
    () => applyFilters(rejectedCompanies),
    [rejectedCompanies, search, industryFilter, sortBy],
  );

  const filteredRemoved = useMemo(
    () => applyFilters(removedCompanies),
    [removedCompanies, search, industryFilter, sortBy],
  );

  const approvalRate =
    totalPending + totalPartners + totalRejected + totalRemoved === 0
      ? null
      : Math.round(
          (totalPartners /
            (totalPending +
              totalPartners +
              totalRejected +
              totalRemoved ||
              1)) *
            100,
        );

  const handleExportPartnersCsv = () => {
    if (filteredPartners.length === 0) {
      toast.info("No approved partners to export.");
      return;
    }
    const header = [
      "Company",
      "Org ID",
      "Status",
      "Industry",
      "Website",
      "Created At",
    ];
    const rowsCsv = filteredPartners.map((p) => {
      const values = [
        p.companyName ?? "",
        String(p.companyOrgId ?? ""),
        p.status ?? "",
        p.industry ?? "",
        p.websiteUrl ?? "",
        p.createdAt ? new Date(p.createdAt).toISOString() : "",
      ];
      return values
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",");
    });

    const csv = [header.join(","), ...rowsCsv].join("\n");
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", "approved-partners.csv");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const togglePartnerDetails = (id: number) => {
    setSelectedPartnerId((prev) => (prev === id ? null : id));
  };

  return (
    <UniversityDashboardShell title="Companies & Partners">
      <div className="space-y-4">
        {/* Hero / Metrics strip */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Partner Network */}
          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-900">
                Partner Network
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-semibold tracking-tight text-slate-900">
                  {totalPartners}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Approved recruiting partners connected to your university.
                </p>
              </div>
              <div className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-medium uppercase tracking-wide text-emerald-700">
                Live
              </div>
            </CardContent>
          </Card>

          {/* Pending requests */}
          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-900">
                Pending Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-semibold tracking-tight text-slate-900">
                  {totalPending}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Companies waiting for approval to access your students.
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-[10px] font-medium text-orange-700 border border-orange-100">
                Action needed
              </span>
            </CardContent>
          </Card>

          {/* Network health */}
          <Card className="border border-slate-200 shadow-sm bg-white">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-slate-900">
                Network Health
              </CardTitle>
              <Button
                variant="outline"
                size="icon"
                onClick={load}
                disabled={loading || !orgId}
                className="h-7 w-7"
              >
                <RefreshCw
                  className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
                />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-slate-600">
                Track how selectively your university approves recruiting
                partners.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{
                      width:
                        approvalRate === null ? "0%" : `${approvalRate}%`,
                    }}
                  />
                </div>
                <span className="text-[11px] text-slate-500">
                  {approvalRate === null
                    ? "No data yet"
                    : `${approvalRate}% approved`}
                </span>
              </div>
              {(totalRejected > 0 || totalRemoved > 0) && (
                <p className="text-[11px] text-slate-500">
                  {totalRejected} rejected & {totalRemoved} removed partnership
                  {totalRemoved === 1 ? "" : "s"} to protect student quality &
                  fit.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main management card */}
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base md:text-lg text-slate-900">
                  Companies & Approved Partners
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">
                  Curate a high-quality network of employers who can recruit
                  directly from your student base.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Tabs
                  value={activeTab}
                  onValueChange={(v) => {
                    setActiveTab(v as TabValue);
                    // Clear expanded partner when switching away from partners tab
                    if (v !== "partners") {
                      setSelectedPartnerId(null);
                    }
                  }}
                  className="w-full sm:w-auto"
                >
                  <TabsList className="h-8">
                    <TabsTrigger value="requests" className="px-3 text-xs">
                      Requests
                      {totalPending > 0 && (
                        <span className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-orange-50 px-2 text-[10px] font-medium text-orange-700 border border-orange-100">
                          {totalPending}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="partners" className="px-3 text-xs">
                      Approved Partners
                      {totalPartners > 0 && (
                        <span className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-50 px-2 text-[10px] font-medium text-emerald-700 border border-emerald-100">
                          {totalPartners}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="rejected" className="px-3 text-xs">
                      Rejected
                      {totalRejected > 0 && (
                        <span className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-50 px-2 text-[10px] font-medium text-red-700 border border-red-100">
                          {totalRejected}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="removed" className="px-3 text-xs">
                      Removed
                      {totalRemoved > 0 && (
                        <span className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-slate-50 px-2 text-[10px] font-medium text-slate-700 border border-slate-200">
                          {totalRemoved}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="w-full sm:w-36">
                    <Select
                      value={sortBy}
                      onValueChange={(v) =>
                        setSortBy(v as "recent" | "name")
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Sort" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recent">
                          Sort: Recently added
                        </SelectItem>
                        <SelectItem value="name">
                          Sort: Name A–Z
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {industries.length > 0 && (
                    <div className="w-full sm:w-40">
                      <Select
                        value={industryFilter}
                        onValueChange={(v) => setIndustryFilter(v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Filter by industry" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All industries</SelectItem>
                          {industries.map((ind) => (
                            <SelectItem key={ind} value={ind}>
                              {ind}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="w-full sm:w-56">
                    <Input
                      placeholder="Search by company name..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            {loading ? (
              <div className="bg-white border rounded-lg p-8 text-center text-sm text-gray-600">
                Loading company relationships...
              </div>
            ) : !hasVisibleData ? (
              <div className="bg-white border rounded-lg p-8 text-center text-sm text-gray-600">
                No company requests, partners, or rejections yet. Once companies
                request access to your university, you&apos;ll manage them here.
              </div>
            ) : (
              <Tabs value={activeTab}>
                {/* Requests Tab */}
                <TabsContent value="requests">
                  {filteredPending.length === 0 ? (
                    <div className="bg-white border rounded-lg p-8 text-center text-sm text-gray-600">
                      {search || industryFilter !== "all"
                        ? "No pending requests match your filters."
                        : "No pending partner requests. Great job staying up to date!"}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredPending.map((r) => (
                        <div
                          key={r.id}
                          className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold uppercase text-white overflow-hidden">
                              {r.logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={r.logoUrl}
                                  alt={r.companyName || "Logo"}
                                  className="h-9 w-9 rounded-full object-cover"
                                />
                              ) : (
                                (r.companyName
                                  ?.split(" ")
                                  .map((w) => w[0])
                                  .join("")
                                  .slice(0, 2) || "CO")
                              )}
                            </div>
                            <div>
                              <h3 className="text-sm md:text-base font-semibold text-slate-900">
                                {r.companyName || `Company #${r.companyOrgId}`}
                              </h3>
                              <p className="mt-1 text-xs text-slate-500">
                                Org ID: {r.companyOrgId} · Request ID: {r.id}
                              </p>
                              {r.industry && (
                                <p className="mt-1 text-[11px] text-slate-500">
                                  Industry: {r.industry}
                                </p>
                              )}
                              <p className="mt-2 text-xs text-slate-500">
                                This company has requested to become a
                                recruiting partner for your students. Approve
                                to enable job postings and event participation.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-stretch md:self-auto md:justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600"
                              onClick={() => act(r.id, "approve")}
                            >
                              <Check className="w-4 h-4 mr-1.5" /> Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              onClick={() => act(r.id, "reject")}
                            >
                              <X className="w-4 h-4 mr-1.5" /> Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Partners Tab */}
                <TabsContent value="partners">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-slate-500">
                      Approved partners can post jobs and host events targeting
                      your students.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={handleExportPartnersCsv}
                    >
                      Export CSV
                    </Button>
                  </div>

                  {filteredPartners.length === 0 ? (
                    <div className="bg-white border rounded-lg p-8 text-center text-sm text-gray-600">
                      {search || industryFilter !== "all"
                        ? "No approved partners match your filters."
                        : "No approved partners yet. Approve company requests to start building your partner network."}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredPartners.map((r) => {
                        const isExpanded = selectedPartnerId === r.id;
                        return (
                          <div
                            key={r.id}
                            className={`group rounded-lg border ${
                              isExpanded
                                ? "border-emerald-300 bg-emerald-50/80"
                                : "border-emerald-100 bg-emerald-50/60"
                            } p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md`}
                          >
                            {/* Top row */}
                            <div
                              className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between cursor-pointer"
                              onClick={() => togglePartnerDetails(r.id)}
                            >
                              <div className="flex items-start gap-3 flex-1">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-semibold uppercase text-white overflow-hidden">
                                  {r.logoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={r.logoUrl}
                                      alt={r.companyName || "Logo"}
                                      className="h-9 w-9 rounded-full object-cover"
                                    />
                                  ) : (
                                    (r.companyName
                                      ?.split(" ")
                                      .map((w) => w[0])
                                      .join("")
                                      .slice(0, 2) || "CO")
                                  )}
                                </div>
                                <div>
                                  <h3 className="text-sm md:text-base font-semibold text-emerald-900">
                                    {r.companyName ||
                                      `Company #${r.companyOrgId}`}
                                  </h3>
                                  <p className="mt-1 text-xs text-emerald-800/80">
                                    Approved recruiting partner · Org ID:{" "}
                                    {r.companyOrgId}
                                  </p>
                                  {r.industry && (
                                    <p className="mt-1 text-[11px] text-emerald-800/80">
                                      Industry: {r.industry}
                                    </p>
                                  )}
                                  <p className="mt-2 text-xs text-emerald-900/80">
                                    {isExpanded
                                      ? "Click to hide engagement details."
                                      : "Click to view engagement details, company overview, and internal notes."}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center justify-end gap-2">
                                <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                                  Approved partner
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const ok = window.confirm(
                                      "Removing this partner will prevent them from posting new jobs or events through your university. Existing student applications remain in the system. Continue?",
                                    );
                                    if (!ok) return;
                                    act(r.id, "remove");
                                  }}
                                >
                                  <Trash2 className="w-4 h-4 mr-1.5" /> Remove
                                </Button>
                              </div>
                            </div>

                            {/* Inline expanded details under THIS company */}
                            {isExpanded && (
                              <div className="mt-4 rounded-md border border-slate-200 bg-white p-3 text-sm">
                                <div className="space-y-3">
                                  {/* Basic meta */}
                                  <div className="space-y-1">
                                    <p className="text-xs text-slate-500">
                                      <span className="font-semibold text-slate-800">
                                        Org ID:
                                      </span>{" "}
                                      {r.companyOrgId}
                                    </p>
                                    {r.industry && (
                                      <p className="text-xs text-slate-500">
                                        <span className="font-semibold text-slate-800">
                                          Industry:
                                        </span>{" "}
                                        {r.industry}
                                      </p>
                                    )}
                                    {r.websiteUrl && (
                                      <p className="text-xs text-slate-500">
                                        <span className="font-semibold text-slate-800">
                                          Website:
                                        </span>{" "}
                                        <a
                                          href={r.websiteUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="underline"
                                        >
                                          {r.websiteUrl}
                                        </a>
                                      </p>
                                    )}
                                    {r.createdAt && (
                                      <p className="text-xs text-slate-500">
                                        <span className="font-semibold text-slate-800">
                                          Connected on:
                                        </span>{" "}
                                        {new Date(
                                          r.createdAt,
                                        ).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>

                                  {/* Engagement snapshot */}
                                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                                    <p className="text-xs font-semibold text-slate-700 mb-1">
                                      Engagement snapshot (MVP)
                                    </p>
                                    <p className="text-xs text-slate-500">
                                      This section can later show jobs posted
                                      for your students, events hosted, and
                                      total applications. For now, it
                                      communicates that Upstride is built to
                                      track employer quality and engagement over
                                      time.
                                    </p>
                                  </div>

                                  {/* Company overview */}
                                  <div className="space-y-1">
                                    <p className="text-xs font-semibold text-slate-700 mb-1">
                                      Company overview
                                    </p>
                                    <p className="text-xs text-slate-500 whitespace-pre-line leading-relaxed">
                                      {r.aboutCompany ||
                                        "No company overview provided yet. You can still manage this partner relationship and track engagement through Upstride."}
                                    </p>
                                  </div>

                                  {/* Internal notes placeholder */}
                                  <div className="rounded-md border border-dashed border-slate-200 p-3 bg-slate-50/80">
                                    <p className="text-xs font-semibold text-slate-700 mb-1">
                                      Internal notes (future enhancement)
                                    </p>
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                      You&apos;ll be able to add private notes
                                      here for your career center team (e.g.,
                                      “Great for CS internships, but comp is
                                      low”). Notes stay internal to the
                                      university and are never visible to
                                      companies or students.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* Rejected Tab */}
                <TabsContent value="rejected">
                  {filteredRejected.length === 0 ? (
                    <div className="bg-white border rounded-lg p-8 text-center text-sm text-gray-600">
                      {search || industryFilter !== "all"
                        ? "No rejected companies match your filters."
                        : "No rejected companies yet. Rejected requests will appear here for audit history."}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredRejected.map((r) => (
                        <div
                          key={r.id}
                          className="group rounded-lg border border-red-100 bg-red-50/70 p-4 shadow-sm transition hover:border-red-200 hover:shadow-md flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500 text-[11px] font-semibold uppercase text-white">
                              {r.companyName
                                ?.split(" ")
                                .map((w) => w[0])
                                .join("")
                                .slice(0, 2) || "CO"}
                            </div>
                            <div>
                              <h3 className="text-sm md:text-base font-semibold text-red-900">
                                {r.companyName || `Company #${r.companyOrgId}`}
                              </h3>
                              <p className="mt-1 text-xs text-red-900/80">
                                Rejected partner request · Org ID:{" "}
                                {r.companyOrgId} · Request ID: {r.id}
                              </p>
                              <p className="mt-2 text-xs text-red-900/80">
                                This company&apos;s request was rejected. They
                                cannot access your students or post jobs
                                through this university account.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-slate-700 border-slate-200 hover:bg-slate-50 text-[11px]"
                              onClick={() => act(r.id, "reconsider")}
                            >
                              <ArrowLeftRight className="w-4 h-4 mr-1.5" />{" "}
                              Reconsider (back to pending)
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Removed Tab */}
                <TabsContent value="removed">
                  {filteredRemoved.length === 0 ? (
                    <div className="bg-white border rounded-lg p-8 text-center text-sm text-gray-600">
                      {search || industryFilter !== "all"
                        ? "No removed companies match your filters."
                        : "No removed partnerships yet. Removing partners keeps your network current and high-quality."}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredRemoved.map((r) => (
                        <div
                          key={r.id}
                          className="group rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-[11px] font-semibold uppercase text-white">
                              {r.companyName
                                ?.split(" ")
                                .map((w) => w[0])
                                .join("")
                                .slice(0, 2) || "CO"}
                            </div>
                            <div>
                              <h3 className="text-sm md:text-base font-semibold text-slate-900">
                                {r.companyName || `Company #${r.companyOrgId}`}
                              </h3>
                              <p className="mt-1 text-xs text-slate-700/80">
                                Partnership removed · Org ID: {r.companyOrgId} ·
                                Request ID: {r.id}
                              </p>
                              <p className="mt-2 text-xs text-slate-700/80">
                                This company was previously approved but later
                                removed. They no longer have access to your
                                students or job/event tools.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200">
                              Partnership removed
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </UniversityDashboardShell>
  );
}
