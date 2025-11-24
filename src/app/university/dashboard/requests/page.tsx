"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import UniversityDashboardShell from "@/components/university/UniversityDashboardShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

type RequestRow = {
  id: number;
  companyOrgId: number;
  companyName: string;
  status: string; // "pending" | "approved" | "rejected"
};

type TabValue = "requests" | "partners" | "rejected";

export default function PartnersPage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabValue>("requests");

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

  const act = async (id: number, action: "approve" | "reject") => {
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
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: action === "approve" ? "approved" : "rejected",
              }
            : r,
        ),
      );

      toast.success(
        action === "approve"
          ? "Company approved as a recruiting partner."
          : "Request rejected.",
      );
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

  const totalPending = pendingRequests.length;
  const totalPartners = approvedPartners.length;
  const totalRejected = rejectedCompanies.length;
  const hasVisibleData = totalPending + totalPartners + totalRejected > 0;

  const filteredPending = useMemo(() => {
    if (!search) return pendingRequests;
    const q = search.toLowerCase();
    return pendingRequests.filter((r) =>
      (r.companyName || "").toLowerCase().includes(q),
    );
  }, [pendingRequests, search]);

  const filteredPartners = useMemo(() => {
    if (!search) return approvedPartners;
    const q = search.toLowerCase();
    return approvedPartners.filter((r) =>
      (r.companyName || "").toLowerCase().includes(q),
    );
  }, [approvedPartners, search]);

  const filteredRejected = useMemo(() => {
    if (!search) return rejectedCompanies;
    const q = search.toLowerCase();
    return rejectedCompanies.filter((r) =>
      (r.companyName || "").toLowerCase().includes(q),
    );
  }, [rejectedCompanies, search]);

  const approvalRate =
    totalPending + totalPartners + totalRejected === 0
      ? null
      : Math.round(
          (totalPartners /
            (totalPending + totalPartners + totalRejected || 1)) *
            100,
        );

  return (
    <UniversityDashboardShell title="Companies & Partners">
      <div className="space-y-4">
        {/* Hero / Metrics strip */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-none shadow-sm bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-200">
                Partner Network
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-end justify-between">
              <div>
                <p className="text-3xl font-semibold tracking-tight">
                  {totalPartners}
                </p>
                <p className="mt-1 text-xs text-slate-300">
                  Approved recruiting partners connected to your university.
                </p>
              </div>
              <div className="rounded-full border border-slate-600 px-3 py-1 text-[10px] uppercase tracking-wide text-slate-200">
                Live
              </div>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
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
              <span className="inline-flex items-center rounded-full bg-orange-50 px-3 py-1 text-[10px] font-medium text-orange-700">
                Action needed
              </span>
            </CardContent>
          </Card>

          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium">
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
              {totalRejected > 0 && (
                <p className="text-[11px] text-slate-500">
                  {totalRejected} compan{totalRejected === 1 ? "y" : "ies"}{" "}
                  rejected to protect student quality & fit.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main management card */}
        <Card className="border border-slate-200 shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-base md:text-lg">
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
                  onValueChange={(v) => setActiveTab(v as TabValue)}
                  className="w-full sm:w-auto"
                >
                  <TabsList className="h-8">
                    <TabsTrigger value="requests" className="px-3 text-xs">
                      Requests
                      {totalPending > 0 && (
                        <span className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-orange-100 px-2 text-[10px] font-medium text-orange-700">
                          {totalPending}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="partners" className="px-3 text-xs">
                      Approved Partners
                      {totalPartners > 0 && (
                        <span className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-emerald-100 px-2 text-[10px] font-medium text-emerald-700">
                          {totalPartners}
                        </span>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="rejected" className="px-3 text-xs">
                      Rejected
                      {totalRejected > 0 && (
                        <span className="ml-2 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-100 px-2 text-[10px] font-medium text-red-700">
                          {totalRejected}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

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
                      {search
                        ? "No pending requests match your search."
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
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold uppercase text-white">
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
                              <p className="mt-1 text-xs text-slate-500">
                                Org ID: {r.companyOrgId} · Request ID: {r.id}
                              </p>
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
                  {filteredPartners.length === 0 ? (
                    <div className="bg-white border rounded-lg p-8 text-center text-sm text-gray-600">
                      {search
                        ? "No approved partners match your search."
                        : "No approved partners yet. Approve company requests to start building your partner network."}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredPartners.map((r) => (
                        <div
                          key={r.id}
                          className="group rounded-lg border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm transition hover:border-emerald-200 hover:shadow-md flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-semibold uppercase text-white">
                              {r.companyName
                                ?.split(" ")
                                .map((w) => w[0])
                                .join("")
                                .slice(0, 2) || "CO"}
                            </div>
                            <div>
                              <h3 className="text-sm md:text-base font-semibold text-emerald-900">
                                {r.companyName || `Company #${r.companyOrgId}`}
                              </h3>
                              <p className="mt-1 text-xs text-emerald-800/80">
                                Approved recruiting partner · Org ID:{" "}
                                {r.companyOrgId}
                              </p>
                              <p className="mt-2 text-xs text-emerald-900/80">
                                This company can now participate in job
                                postings, events, and campaigns targeting your
                                students.
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <span className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200">
                              Approved partner
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Rejected Tab */}
                <TabsContent value="rejected">
                  {filteredRejected.length === 0 ? (
                    <div className="bg-white border rounded-lg p-8 text-center text-sm text-gray-600">
                      {search
                        ? "No rejected companies match your search."
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
                            <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-red-700 ring-1 ring-red-200">
                              Rejected
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
