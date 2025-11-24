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
  MapPin,
  Globe2,
  Link as LinkIcon,
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

  // Rich profile
  headline: string | null;
  about: string | null;
  locationCity: string | null;
  locationCountry: string | null;
  websiteUrl: string | null;
  skills: string[] | null;
  whatsapp: string | null;
  province: string | null;
  linkedinUrl: string | null;
  portfolioUrl: string | null;
  githubUrl: string | null;
  workAuth: string | null;
  needSponsorship: boolean | null;
  willingRelocate: boolean | null;
  remotePref: string | null;
  earliestStart: string | null;
  salaryExpectation: string | null;
  expectedSalaryPkr: number | null;
  noticePeriodDays: number | null;
  experienceYears: string | number | null;

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

type StudentExperience = {
  id: number;
  title: string | null;
  company: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean | null;
  location: string | null;
};

type StudentEducation = {
  id: number;
  school: string | null;
  degree: string | null;
  field: string | null;
  startYear: number | null;
  endYear: number | null;
  gpa: string | number | null;
};

type StudentLink = {
  id: number;
  label: string | null;
  url: string | null;
};

type StudentStats = {
  totalApplications: number;
  activeApplications: number;
  lastApplicationAt: string | null;
  eventsRegistered: number;
  eventsAttended: number;
  savedJobsCount: number;
};

type ApiResponse = {
  student: StudentDetail;
  applications: StudentApplication[];
  experiences: StudentExperience[];
  educations: StudentEducation[];
  links: StudentLink[];
  stats: StudentStats;
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString();
}

function formatMonthYear(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
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
  const [experiences, setExperiences] = useState<StudentExperience[]>([]);
  const [educations, setEducations] = useState<StudentEducation[]>([]);
  const [links, setLinks] = useState<StudentLink[]>([]);
  const [stats, setStats] = useState<StudentStats | null>(null);
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
      const payload = data as ApiResponse;
      setStudent(payload.student);
      setApplications(payload.applications || []);
      setExperiences(payload.experiences || []);
      setEducations(payload.educations || []);
      setLinks(payload.links || []);
      setStats(payload.stats || null);
    } catch (e: any) {
      console.error("Error loading student detail", e);
      setError(e?.message || "Something went wrong.");
      setStudent(null);
      setApplications([]);
      setExperiences([]);
      setEducations([]);
      setLinks([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const experienceYearsLabel = (() => {
    if (!student?.experienceYears) return "";
    const n = Number(student.experienceYears);
    if (Number.isNaN(n) || n <= 0) return "";
    if (n < 1) return "< 1 year of experience";
    if (n === 1) return "1 year of experience";
    return `${n.toFixed(n % 1 === 0 ? 0 : 1)} years of experience`;
  })();

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
          {/* Student info + stats */}
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
                  {student.headline && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {student.headline}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">
                    {student.program || "Program not set"}
                    {student.gradYear
                      ? ` • Class of ${student.gradYear}`
                      : ""}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {student.locationCity || student.locationCountry ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {[student.locationCity, student.locationCountry]
                          .filter(Boolean)
                          .join(", ")}
                      </span>
                    ) : null}
                    {experienceYearsLabel && (
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {experienceYearsLabel}
                      </span>
                    )}
                    {student.createdAt && (
                      <span className="inline-flex items-center gap-1">
                        Joined: {formatDate(student.createdAt)}
                      </span>
                    )}
                  </div>
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
            {stats && (
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-3 text-xs text-muted-foreground">
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {stats.totalApplications}
                    </div>
                    <div>Total applications</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {stats.activeApplications}
                    </div>
                    <div>Active applications</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {stats.savedJobsCount}
                    </div>
                    <div>Saved jobs</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {stats.eventsRegistered}
                    </div>
                    <div>Events registered</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {stats.eventsAttended}
                    </div>
                    <div>Events attended</div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">
                      {stats.lastApplicationAt
                        ? formatDate(stats.lastApplicationAt)
                        : "—"}
                    </div>
                    <div>Last application activity</div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Profile: about, skills, links */}
          {(student.about ||
            (student.skills && student.skills.length > 0) ||
            student.linkedinUrl ||
            student.portfolioUrl ||
            student.githubUrl ||
            student.websiteUrl ||
            links.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe2 className="h-5 w-5 text-muted-foreground" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {student.about && (
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {student.about}
                  </p>
                )}

                {student.skills && student.skills.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Skills
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {student.skills.map((skill) => (
                        <Badge
                          key={skill}
                          variant="outline"
                          className="text-[10px]"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {(student.linkedinUrl ||
                  student.portfolioUrl ||
                  student.githubUrl ||
                  student.websiteUrl ||
                  links.length > 0) && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Links
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {student.linkedinUrl && (
                        <a
                          href={student.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#3d6a4a] underline"
                        >
                          <LinkIcon className="h-3 w-3" />
                          LinkedIn
                        </a>
                      )}
                      {student.portfolioUrl && (
                        <a
                          href={student.portfolioUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#3d6a4a] underline"
                        >
                          <LinkIcon className="h-3 w-3" />
                          Portfolio
                        </a>
                      )}
                      {student.githubUrl && (
                        <a
                          href={student.githubUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#3d6a4a] underline"
                        >
                          <LinkIcon className="h-3 w-3" />
                          GitHub
                        </a>
                      )}
                      {student.websiteUrl && (
                        <a
                          href={student.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#3d6a4a] underline"
                        >
                          <LinkIcon className="h-3 w-3" />
                          Website
                        </a>
                      )}
                      {links.map((l) =>
                        l.url ? (
                          <a
                            key={l.id}
                            href={l.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[#3d6a4a] underline"
                          >
                            <LinkIcon className="h-3 w-3" />
                            {l.label || l.url}
                          </a>
                        ) : null
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Work preferences / logistics */}
          {(student.workAuth ||
            student.remotePref ||
            student.willingRelocate !== null ||
            student.willingRelocate === true ||
            student.needSponsorship !== null ||
            student.needSponsorship === true ||
            student.earliestStart ||
            student.salaryExpectation ||
            student.expectedSalaryPkr ||
            student.noticePeriodDays) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                  Work preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
                {student.workAuth && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Work authorization
                    </p>
                    <p>{student.workAuth}</p>
                  </div>
                )}
                {student.needSponsorship !== null &&
                  student.needSponsorship !== undefined && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Sponsorship needed
                      </p>
                      <p>{student.needSponsorship ? "Yes" : "No"}</p>
                    </div>
                  )}
                {student.remotePref && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Remote / onsite preference
                    </p>
                    <p>{student.remotePref}</p>
                  </div>
                )}
                {student.willingRelocate !== null &&
                  student.willingRelocate !== undefined && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Willing to relocate
                      </p>
                      <p>{student.willingRelocate ? "Yes" : "No"}</p>
                    </div>
                  )}
                {student.earliestStart && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Earliest start
                    </p>
                    <p>{student.earliestStart}</p>
                  </div>
                )}
                {(student.salaryExpectation || student.expectedSalaryPkr) && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Salary expectations
                    </p>
                    <p>
                      {student.salaryExpectation
                        ? student.salaryExpectation
                        : ""}
                      {student.expectedSalaryPkr
                        ? `${
                            student.salaryExpectation ? " • " : ""
                          }PKR ${student.expectedSalaryPkr.toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                )}
                {student.noticePeriodDays && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Notice period
                    </p>
                    <p>{student.noticePeriodDays} days</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Experience */}
          {experiences.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                  Experience
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {experiences.map((exp) => (
                  <div key={exp.id} className="space-y-0.5">
                    <div className="font-medium">
                      {exp.title || "Experience"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {exp.company}
                      {exp.location ? ` • ${exp.location}` : ""}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatMonthYear(exp.startDate) || "Start"}{" "}
                      {"– "}
                      {exp.isCurrent
                        ? "Present"
                        : formatMonthYear(exp.endDate) || "End"}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Education */}
          {educations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-muted-foreground" />
                  Education
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {educations.map((edu) => (
                  <div key={edu.id} className="space-y-0.5">
                    <div className="font-medium">
                      {edu.school || "School"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {[edu.degree, edu.field].filter(Boolean).join(" • ")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {edu.startYear ? `${edu.startYear}` : ""}
                      {edu.endYear ? ` – ${edu.endYear}` : ""}
                      {edu.gpa ? ` • GPA ${edu.gpa}` : ""}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

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
