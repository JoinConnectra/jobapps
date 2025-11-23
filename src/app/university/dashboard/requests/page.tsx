"use client";

import { useEffect, useState, useCallback } from "react";
import UniversityDashboardShell from "@/components/university/UniversityDashboardShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

type RequestRow = {
  id: number;
  companyOrgId: number;
  companyName: string;
  status: string;
};

export default function RequestsPage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Get university orgId
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
      } catch {
        // ignore
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
      if (resp.ok) {
        const data = await resp.json();
        setRows(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    load();
  }, [orgId, load]);

  const act = async (id: number, action: "approve" | "reject") => {
    const resp = await fetch(
      `/api/university/requests/${id}/${action}`,
      { method: "POST" },
    );
    if (resp.ok) {
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
      toast.success(`Request ${action}d successfully!`);
    } else {
      toast.error(`Failed to ${action} request.`);
    }
  };

  return (
    <UniversityDashboardShell title="Partner Requests">
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">
            Partner Requests
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Approve or reject requests from companies that want to connect
            with your university.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="bg-white border rounded-lg p-8 text-center text-sm text-gray-600">
              Loading requests...
            </div>
          ) : rows.length === 0 ? (
            <div className="bg-white border rounded-lg p-8 text-center text-sm text-gray-600">
              No pending partner requests.
            </div>
          ) : (
            <div className="space-y-4">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-lg shadow-sm p-5 flex items-center justify-between"
                >
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {r.companyName || `Company #${r.companyOrgId}`}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Status: {r.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.status === "pending" ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-[#6a994e] text-white hover:bg-[#5a8a3e]"
                          onClick={() => act(r.id, "approve")}
                        >
                          <Check className="w-4 h-4 mr-2" /> Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => act(r.id, "reject")}
                        >
                          <X className="w-4 h-4 mr-2" /> Reject
                        </Button>
                      </>
                    ) : (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          r.status === "approved"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {r.status.charAt(0).toUpperCase() +
                          r.status.slice(1)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </UniversityDashboardShell>
  );
}
