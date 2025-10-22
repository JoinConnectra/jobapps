"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession, authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Eye, Users, Briefcase, Search, HelpCircle, UserPlus, LogOut, Bell } from "lucide-react";
import Link from "next/link";

interface Question {
  id?: number;
  prompt: string;
  kind?: 'voice' | 'text';
  maxSec: number;
  maxChars?: number | null;
  required: boolean;
  orderIndex: number;
}

interface Job {
  id: number;
  title: string;
  dept: string | null;
  locationMode: string | null;
  salaryRange: string | null;
  descriptionMd: string | null;
  status: string;
  orgId: number;
}

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, isPending } = useSession();
  const [job, setJob] = useState<Job | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [org, setOrg] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user && params.id) {
      fetchJobData();
      fetchOrg();
    }
  }, [session, params.id]);

  const fetchOrg = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const orgResp = await fetch("/api/organizations?mine=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (orgResp.ok) {
        const orgs = await orgResp.json();
        if (Array.isArray(orgs) && orgs.length > 0) {
          setOrg(orgs[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch org:", error);
    }
  };

  const fetchJobData = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      
      const jobResponse = await fetch(`/api/jobs?id=${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (jobResponse.ok) {
        const jobData = await jobResponse.json();
        setJob(jobData);
      }

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

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        prompt: "",
        kind: 'voice',
        maxSec: 120,
        maxChars: null,
        required: true,
        orderIndex: questions.length,
      },
    ]);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

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
      fetchJobData();
    } catch (error) {
      toast.error("Failed to save questions");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) {
      toast.error(error.code);
    } else {
      localStorage.removeItem("bearer_token");
      router.push("/");
    }
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session?.user || !job) return null;

  const applicationUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/apply/${job.id}`;

  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
      {/* Left Sidebar */}
      <aside className="w-64 bg-[#FEFEFA] border-r border-gray-200 flex flex-col">
        <div className="p-6">
          <div className="text-xl font-bold text-gray-900 mb-6">{org?.name || "forshadow"}</div>
          
          <Button onClick={() => router.push("/dashboard/jobs?create=1")} className="w-full mb-6 bg-[#F5F1E8] text-gray-900 hover:bg-[#E8E0D5] border-0">
            + Create a Job
          </Button>
          
          <nav className="space-y-1">
            <Button variant="ghost" className="w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900" onClick={() => router.push("/dashboard")}>
              <Bell className="w-4 h-4 mr-3" />
              Activities
            </Button>
            <Button variant="ghost" className="w-full justify-start text-gray-700 bg-[#F5F1E8] text-gray-900" onClick={() => router.push("/dashboard/jobs")}>
              <Briefcase className="w-4 h-4 mr-3" />
              Jobs
            </Button>
          </nav>
        </div>
        
        <div className="mt-auto p-6 border-t border-gray-200">
          <div className="space-y-3">
            <Button variant="ghost" className="w-full justify-start text-gray-500 text-sm">
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
            <Button variant="ghost" className="w-full justify-start text-gray-500 text-sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-3" />
              Log out
            </Button>
          </div>
          
          <div className="mt-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
              <span className="text-white text-sm font-medium">{session.user.name?.charAt(0)}</span>
            </div>
            <div className="text-sm font-medium text-gray-900">{session.user.name}</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-[#FEFEFA] p-8">
        <div className="max-w-5xl">
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

          {/* Job Header */}
          <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-1">
                  {job.title}
                </h2>
                <p className="text-sm text-gray-500">
                  {job.dept} • {job.locationMode} • {job.salaryRange}
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  job.status === "published"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {job.status}
              </span>
            </div>

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
                onClick={() => window.open(applicationUrl, '_blank')}
              >
                <Eye className="w-4 h-4" />
                Preview
              </Button>
            </div>

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

          {/* Questions */}
          <div className="bg-white rounded-lg shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  Questions
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Configure voice or text based questions for applicants
                </p>
              </div>
              <Button onClick={addQuestion} className="gap-2 text-sm">
                <Plus className="w-4 h-4" />
                Add Question
              </Button>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                <p className="text-sm text-gray-500 mb-3">
                  No questions added yet
                </p>
                <Button onClick={addQuestion} variant="outline" className="text-sm">
                  Add Your First Question
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {questions.map((question, index) => (
                  <div
                    key={index}
                    className="p-4 border border-gray-200 rounded-lg space-y-3"
                  >
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

                    <div>
                      <Input
                        value={question.prompt}
                        onChange={(e) =>
                          updateQuestion(index, "prompt", e.target.value)
                        }
                        placeholder="e.g., Tell us about your experience with React"
                        className="text-sm"
                      />
                    </div>

                  <div className="flex gap-3 items-center flex-wrap">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Type:</Label>
                      <select
                        value={question.kind || 'voice'}
                        onChange={(e) => updateQuestion(index, 'kind', e.target.value as any)}
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
                            updateQuestion(
                              index,
                              "maxSec",
                              parseInt(e.target.value)
                            )
                          }
                          className="w-16 text-xs"
                          min="30"
                          max="300"
                        />
                        <span className="text-xs text-gray-500">
                          sec
                        </span>
                      </div>
                    {question.kind === 'text' && (
                      <div className="flex items-center gap-2">
                        <Label className="text-xs">Max chars:</Label>
                        <Input
                          type="number"
                          value={question.maxChars || 0}
                          onChange={(e) => updateQuestion(index, 'maxChars', parseInt(e.target.value))}
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

                <Button
                  onClick={saveQuestions}
                  disabled={saving}
                  className="w-full text-sm"
                >
                  {saving ? "Saving..." : "Save Questions"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}