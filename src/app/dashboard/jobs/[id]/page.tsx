"use client";

/**
 * JobDetailPage
 * --------------
 * Route: /dashboard/jobs/[id]
 *
 * Purpose:
 * - Shows a single job’s details (title, dept, location, salary, description, status)
 * - Lets recruiters edit job metadata (inline edit mode)
 * - Manages job-specific screening Questions (voice/text) and saves new ones
 * - Provides quick actions: View Applications, Preview public apply URL
 * - Uses the shared left sidebar (Activities / Jobs / Assessments)
 *
 * Data flow:
 * - Auth gate via useSession: redirect to /login when unauthenticated
 * - On mount: fetch organization (for sidebar label) and the job+questions for params.id
 * - PATCH /api/jobs/[id] when saving edits or status changes
 * - POST /api/jobs/[id]/questions to create any newly added (id-less) questions
 *
 * Notes:
 * - Existing questions are displayed; only new questions get POSTed (no update/delete API shown here)
 * - Assessments nav item routes to /dashboard/organizations/[orgId]/assessments
 */

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession, authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  ListChecks,
  Plus,
  Trash2,
  BarChartIcon,
  Eye,
  Users,
  Briefcase,
  Search,
  HelpCircle,
  UserPlus,
  LogOut,
  Bell,
  Edit,
  Save,
  X,
  Settings,
} from "lucide-react";
import Link from "next/link";
import CommandPalette from "@/components/CommandPalette";
import SettingsModal from "@/components/SettingsModal";
import CompanySidebar from "@/components/company/CompanySidebar";
import { useCommandPalette } from "@/hooks/use-command-palette";

/** UI model for a screening question on a job */
interface Question {
  id?: number;              // present if persisted
  prompt: string;           // the actual question
  kind?: "voice" | "text";  // input type
  maxSec: number;           // for voice
  maxChars?: number | null; // for text
  required: boolean;        // is the question required?
  orderIndex: number;       // sort/display order
}

/** Minimal job model used by this page */
interface Job {
  id: number;
  title: string;
  dept: string | null;
  locationMode: string | null;
  salaryRange: string | null;
  descriptionMd: string | null;
  status: string;     // draft | published | closed (archived)
  orgId: number;
}

export default function JobDetailPage() {
  // ---- Routing & session ----
  const router = useRouter();
  const params = useParams();
  const { data: session, isPending } = useSession();

  // ---- Command palette ----
  const {
    isOpen: isCommandPaletteOpen,
    open: openCommandPalette,
    close: closeCommandPalette,
  } = useCommandPalette();

  // ---- Page state ----
  const [job, setJob] = useState<Job | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // organization (for sidebar brand + assessments route)
  const [org, setOrg] = useState<{ id: number; name: string; logoUrl?: string | null } | null>(null);

  // edit mode & temp edit form state
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: "",
    dept: "",
    locationMode: "",
    salaryRange: "",
    descriptionMd: "",
    status: "",
  });

  /**
   * Auth guard: if no user once session resolved => go to /login
   */
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  /**
   * Initial data fetch: organization + job + questions
   */
  useEffect(() => {
    if (session?.user && params.id) {
      fetchJobData();
      fetchOrg();
    }
  }, [session, params.id]);

  /**
   * Load first organization owned by the user (used for brand + assessments route)
   */
  const fetchOrg = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const orgResp = await fetch("/api/organizations?mine=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (orgResp.ok) {
        const orgs = await orgResp.json();
        if (Array.isArray(orgs) && orgs.length > 0) {
          setOrg({ id: orgs[0].id, name: orgs[0].name, logoUrl: orgs[0].logoUrl });
        }
      }
    } catch (error) {
      console.error("Failed to fetch org:", error);
    }
  };

  /**
   * Fetch the job details and its questions for this [id].
   * - Also seeds editData with current job properties.
   */
  const fetchJobData = async () => {
    try {
      const token = localStorage.getItem("bearer_token");

      // Job
      const jobResponse = await fetch(`/api/jobs?id=${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (jobResponse.ok) {
        const jobData = await jobResponse.json();
        setJob(jobData);
        setEditData({
          title: jobData.title || "",
          dept: jobData.dept || "",
          locationMode: jobData.locationMode || "",
          salaryRange: jobData.salaryRange || "",
          descriptionMd: jobData.descriptionMd || "",
          status: jobData.status || "",
        });
      }

      // Questions
      const questionsResponse = await fetch(`/api/jobs/${params.id}/questions`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (questionsResponse.ok) {
        const questionsData = await questionsResponse.json();
        setQuestions(questionsData);
      }
    } catch (error) {
      console.error("Failed to fetch job data:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Add a local-only question row (not persisted until Save Questions).
   */
  const addQuestion = () => {
    setQuestions((prev) => [
      ...prev,
      {
        prompt: "",
        kind: "voice",
        maxSec: 120,
        maxChars: null,
        required: true,
        orderIndex: prev.length,
      },
    ]);
  };

  /** Update a field for a question by index (pure client state until save) */
  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  /** Remove a question row by index (client state only) */
  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  /**
   * Save Questions:
   * - POST only the newly added (id-less) questions to /api/jobs/[id]/questions
   * - After saving, refetch to get fresh list with IDs
   */
  const saveQuestions = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("bearer_token");

      for (const question of questions) {
        if (!question.id && question.prompt.trim()) {
          await fetch(`/api/jobs/${params.id}/questions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              jobId: params.id,
              ...question,
            }),
          });
        }
      }

      toast.success("Questions saved successfully!");
      fetchJobData(); // refresh with server copy (now with IDs)
    } catch (error) {
      toast.error("Failed to save questions");
    } finally {
      setSaving(false);
    }
  };

  /** Enter edit mode for job header fields */
  const handleEdit = () => {
    setEditing(true);
  };

  /** Cancel edit mode and reset temp state back to current job values */
  const handleCancel = () => {
    setEditing(false);
    if (job) {
      setEditData({
        title: job.title || "",
        dept: job.dept || "",
        locationMode: job.locationMode || "",
        salaryRange: job.salaryRange || "",
        descriptionMd: job.descriptionMd || "",
        status: job.status || "",
      });
    }
  };

  /**
   * Save job metadata edits via PATCH /api/jobs/[id]
   */
  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/jobs/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editData),
      });

      if (response.ok) {
        const updatedJob = await response.json();
        setJob(updatedJob);
        setEditing(false);
        toast.success("Job updated successfully!");
      } else {
        toast.error("Failed to update job");
      }
    } catch (error) {
      toast.error("An error occurred while updating the job");
    } finally {
      setSaving(false);
    }
  };

  /** Sign out helper */
  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) {
      toast.error(error.code);
    } else {
      localStorage.removeItem("bearer_token");
      router.push("/");
    }
  };

  // ---- Loading / auth short-circuits ----
  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session?.user || !job) return null;

  // Public apply URL (used by "Preview" button)
  const applicationUrl = `${
    typeof window !== "undefined" ? window.location.origin : ""
  }/apply/${job.id}`;

  // ---- Render ----
  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
      {/* Left Sidebar - Reusable Component */}
      <CompanySidebar
        org={org}
        user={session.user}
        onSignOut={handleSignOut}
        onOpenSettings={() => setIsSettingsOpen(true)}
        active="jobs"
      />

      {/* Main Content: breadcrumbs, job header, and questions editor */}
      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto">
        <div className="p-8">
          <div className="max-w-5xl">
            {/* Breadcrumbs for context */}
            <div className="flex items-center gap-4 mb-8">
              <nav className="flex items-center gap-2 text-sm">
                <Link
                  href="/dashboard"
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Dashboard
                </Link>
                <span className="text-gray-400">&gt;</span>
                <Link
                  href="/dashboard/jobs"
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Jobs
                </Link>
                <span className="text-gray-400">&gt;</span>
                <span className="text-gray-900 font-medium">{job.title}</span>
              </nav>
            </div>

            {/* Job Header (view/edit) */}
            <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                {/* Left: editable fields or read-only view */}
                <div className="flex-1">
                  {editing ? (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">Job Title</Label>
                        <Input
                          value={editData.title}
                          onChange={(e) =>
                            setEditData({ ...editData, title: e.target.value })
                          }
                          className="text-sm"
                          placeholder="Enter job title"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label className="text-xs text-gray-500 mb-1 block">Department</Label>
                          <Input
                            value={editData.dept}
                            onChange={(e) =>
                              setEditData({ ...editData, dept: e.target.value })
                            }
                            className="text-sm"
                            placeholder="e.g. Engineering"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500 mb-1 block">Location</Label>
                          <Input
                            value={editData.locationMode}
                            onChange={(e) =>
                              setEditData({ ...editData, locationMode: e.target.value })
                            }
                            className="text-sm"
                            placeholder="e.g. Remote, NYC"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-gray-500 mb-1 block">Salary Range</Label>
                          <Input
                            value={editData.salaryRange}
                            onChange={(e) =>
                              setEditData({ ...editData, salaryRange: e.target.value })
                            }
                            className="text-sm"
                            placeholder="e.g. $80k-120k"
                          />
                        </div>
                      </div>

                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">Job Description</Label>
                        <Textarea
                          value={editData.descriptionMd}
                          onChange={(e) =>
                            setEditData({ ...editData, descriptionMd: e.target.value })
                          }
                          className="text-sm min-h-[100px]"
                          placeholder="Enter job description..."
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h2 className="text-lg font-medium text-gray-900 mb-1">{job.title}</h2>
                      <p className="text-sm text-gray-500">
                        {job.dept} • {job.locationMode} • {job.salaryRange}
                      </p>
                      {job.descriptionMd && (
                        <div className="mt-2 text-sm text-gray-600 max-w-2xl">
                          {job.descriptionMd}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: actions (edit/save/cancel + status select) */}
                <div className="flex items-center gap-2 ml-4">
                  {editing ? (
                    <>
                      <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1 text-xs">
                        <Save className="w-3 h-3" />
                        {saving ? "Saving..." : "Save"}
                      </Button>
                      <Button onClick={handleCancel} variant="outline" size="sm" className="gap-1 text-xs">
                        <X className="w-3 h-3" />
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={handleEdit} variant="outline" size="sm" className="gap-1 text-xs">
                        <Edit className="w-3 h-3" />
                        Edit
                      </Button>

                      {/* Status select (saves immediately via PATCH) */}
                      <Select
                        value={job.status}
                        onValueChange={async (value) => {
                          try {
                            const token = localStorage.getItem("bearer_token");
                            const response = await fetch(`/api/jobs/${params.id}`, {
                              method: "PATCH",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({ status: value }),
                            });

                            if (response.ok) {
                              const updatedJob = await response.json();
                              setJob(updatedJob);
                              toast.success("Status updated successfully!");
                            } else {
                              toast.error("Failed to update status");
                            }
                          } catch (error) {
                            toast.error("An error occurred while updating status");
                          }
                        }}
                      >
                        <SelectTrigger className="w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                          <SelectItem value="closed">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  )}
                </div>
              </div>

              {/* Header actions: view applications + preview public page */}
              <div className="flex gap-3">
                <Link href={`/dashboard/jobs/${job.id}/applications`} className="flex-1">
                  <Button variant="outline" className="w-full gap-2 text-sm">
                    <Users className="w-4 h-4" />
                    View Applications
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="gap-2 text-sm"
                  onClick={() => window.open(applicationUrl, "_blank")}
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </Button>
              </div>

              {/* Show public application URL only when published */}
              {job.status === "published" && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <Label className="text-xs font-medium text-gray-900 mb-1 block">
                    Application URL:
                  </Label>
                  <code className="text-xs bg-white px-2 py-1 rounded border border-gray-200 block overflow-x-auto">
                    {applicationUrl}
                  </code>
                </div>
              )}
            </div>

            {/* Questions editor */}
            <div className="bg-white rounded-lg shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">Questions</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Configure voice or text based questions for applicants
                  </p>
                </div>
                <Button onClick={addQuestion} className="gap-2 text-sm">
                  <Plus className="w-4 h-4" />
                  Add Question
                </Button>
              </div>

              {/* Empty state vs list of local question rows */}
              {questions.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-500 mb-3">No questions added yet</p>
                  <Button onClick={addQuestion} variant="outline" className="text-sm">
                    Add Your First Question
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {questions.map((question, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                      {/* Row header w/ delete */}
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-medium text-gray-500">
                          Question {index + 1}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(index)}
                          className="text-red-600 hover:text-red-700 text-xs"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>

                      {/* Prompt */}
                      <div>
                        <Input
                          value={question.prompt}
                          onChange={(e) => updateQuestion(index, "prompt", e.target.value)}
                          placeholder="e.g., Tell us about your experience with React"
                          className="text-sm"
                        />
                      </div>

                      {/* Controls: type, duration, max chars (text only), required */}
                      <div className="flex gap-3 items-center flex-wrap">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Type:</Label>
                          <select
                            value={question.kind || "voice"}
                            onChange={(e) =>
                              updateQuestion(index, "kind", e.target.value as any)
                            }
                            className="border border-gray-300 rounded px-2 py-1 text-xs"
                          >
                            <option value="voice">Voice</option>
                            <option value="text">Text</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Max Duration:</Label>
                          <Input
                            type="number"
                            value={question.maxSec}
                            onChange={(e) =>
                              updateQuestion(index, "maxSec", parseInt(e.target.value))
                            }
                            className="w-16 text-xs"
                            min="30"
                            max="300"
                          />
                          <span className="text-xs text-gray-500">sec</span>
                        </div>

                        {question.kind === "text" && (
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Max chars:</Label>
                            <Input
                              type="number"
                              value={question.maxChars || 0}
                              onChange={(e) =>
                                updateQuestion(index, "maxChars", parseInt(e.target.value))
                              }
                              className="w-20 text-xs"
                            />
                          </div>
                        )}

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={question.required}
                            onChange={(e) =>
                              updateQuestion(index, "required", e.target.checked)
                            }
                            className="w-3 h-3"
                          />
                          <span className="text-xs">Required</span>
                        </label>
                      </div>
                    </div>
                  ))}

                  {/* Persist new questions */}
                  <Button onClick={saveQuestions} disabled={saving} className="w-full text-sm">
                    {saving ? "Saving..." : "Save Questions"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Global command palette (⌘K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        orgId={org?.id}
      />

      {/* Settings modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        organization={org ? { id: org.id, name: org.name, slug: '', type: 'company', plan: 'free', seatLimit: 5, createdAt: '', updatedAt: '' } : null}
      />
    </div>
  );
}
