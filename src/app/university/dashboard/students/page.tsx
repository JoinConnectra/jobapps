"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";

import UniversityDashboardShell from "@/components/university/UniversityDashboardShell";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type StudentItem = {
  id: number;
  userId: number;
  name: string | null;
  email: string | null;
  program: string | null;
  gradYear: number | null;
  verified: boolean | null;
  resumeUrl: string | null;
  createdAt: string | null;
};

export default function UniversityStudentsPage() {
  const [orgId, setOrgId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<StudentItem[]>([]);

  // Resolve the university orgId the same way as events: call /api/organizations?mine=true
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
          ? orgs.find((o: any) => o?.type === "university")
          : null;
        if (!cancelled && uni?.id) {
          setOrgId(Number(uni.id));
        }
      } catch (e) {
        console.error("Error loading organizations", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    if (!orgId) {
      setStudents([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/university/students?orgId=${orgId}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error loading students", e);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;
    load();
  }, [orgId, load]);

  const filteredStudents = useMemo(() => {
    if (!q) return students;
    const lower = q.toLowerCase();
    return students.filter((s) => {
      return (
        (s.name && s.name.toLowerCase().includes(lower)) ||
        (s.email && s.email.toLowerCase().includes(lower)) ||
        (s.program && s.program.toLowerCase().includes(lower))
      );
    });
  }, [students, q]);

  return (
    <UniversityDashboardShell title="Students">
      {/* Top row: breadcrumb + search */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="text-xs md:text-sm text-muted-foreground">
          <span className="font-medium">Dashboard</span>
          <span className="mx-1">›</span>
          <span>Students</span>
        </div>
        <div className="w-full max-w-xs ml-auto">
          <Input
            placeholder="Search by name, email, or program..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {/* Content card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base md:text-lg">Students</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              All students linked to this university.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            {students.length} total
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No students found for this university yet.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.map((s) => (
                <div
                  key={s.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {s.name || "Unnamed student"}
                      </span>
                      {s.verified && (
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase tracking-wide"
                        >
                          Verified
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {s.email || "No email"}
                      {" • "}
                      {s.program || "Program not set"}
                      {s.gradYear ? ` • Class of ${s.gradYear}` : ""}
                    </div>
                  </div>
                  <div className="mt-2 md:mt-0 flex items-center gap-3 text-xs">
                    {s.resumeUrl ? (
                      <a
                        href={s.resumeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline text-[#3d6a4a]"
                      >
                        View resume
                      </a>
                    ) : (
                      <span className="text-muted-foreground">
                        No resume uploaded
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
