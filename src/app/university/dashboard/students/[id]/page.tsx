// src/app/university/dashboard/students/[id]/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import UniversityDashboardShell from "@/components/university/UniversityDashboardShell";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Mail,
  GraduationCap,
  FileText,
  Briefcase,
  ArrowLeft,
} from "lucide-react";

type StudentDetail = {
  id: number;
  userId: number;
  universityId: number | null;
  program: string | null;
  gradYear: number | null;
  resumeUrl: string | null;
  verified: boolean | null;
  createdAt: string | null;

  name: string | null;
  email: string | null;
};

type StudentApplication = {
  id: number;
  jobId: number | null;
  stage: string | null;
  createdAt: string | null;

  jobTitle: string | null;
  companyName: string | null;
};

type ApiResponse = {
  student: StudentDetail;
  applications: StudentApplication[];
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

function prettyStage(stage: string | null) {
  if (!stage) return "Applied";
  const s = stage.trim();
  if (!s) return "Applied";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function UniversityStudentDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [applications, setApplications] = useState<StudentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/university/students/${id}`, {
        cache: "no-store",
      });
      const data: ApiResponse | { error?: string } = await res.json();
      if (!res.ok) {
        throw new Error((data as any)?.error || "Failed to load student");
      }
      setStudent((data as ApiResponse).student);
      setApplications((data as ApiResponse).applications || []);
    } catch (e: any) {
      console.error("Error loading student detail", e);
      setError(e?.message || "Something went wrong.");
      setStudent(null);
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <UniversityDashboardShell title="Student details">
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          type="button"
          onClick={() => router.push("/university/dashboard/students")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to students
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4 max-w-3xl">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : error ? (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle className="text-red-600 text-lg">
              {error}
            </CardTitle>
          </CardHeader>
        </Card>
      ) : !student ? (
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle className="text-lg">
              Student not found
            </CardTitle>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6 max-w-3xl">
          {/* Student info */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold flex items-center gap-2">
                    {student.name || "Unnamed student"}
                    {student.verified && (
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase tracking-wide"
                      >
                        Verified
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {student.program || "Program not set"}
                    {student.gradYear
                      ? ` • Class of ${student.gradYear}`
                      : ""}
                  </p>
                  {student.createdAt && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Joined: {formatDate(student.createdAt)}
                    </p>
                  )}
                </div>

                <div className="flex flex-col items-start md:items-end gap-2 text-sm">
                  {student.email && (
                    <a
                      href={`mailto:${student.email}`}
                      className="inline-flex items-center gap-2 text-[#3d6a4a]"
                    >
                      <Mail className="h-4 w-4" />
                      {student.email}
                    </a>
                  )}
                  {student.resumeUrl ? (
                    <a
                      href={student.resumeUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-[#3d6a4a]"
                    >
                      <FileText className="h-4 w-4" />
                      View resume
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      No resume uploaded
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Applications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
                Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  This student hasn’t applied to any jobs through the
                  platform yet.
                </p>
              ) : (
                <div className="space-y-2 text-sm">
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      className="flex flex-col md:flex-row md:items-center md:justify-between rounded-md border border-gray-200 bg-white px-3 py-2"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="font-medium">
                          {app.jobTitle || "Untitled job"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {app.companyName || "Unknown company"}
                        </div>
                      </div>
                      <div className="mt-2 md:mt-0 flex flex-col items-start md:items-end gap-1 text-xs text-muted-foreground">
                        <span>
                          Applied on{" "}
                          {app.createdAt
                            ? formatDate(app.createdAt)
                            : "N/A"}
                        </span>
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase tracking-wide"
                        >
                          {prettyStage(app.stage)}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </UniversityDashboardShell>
  );
}
