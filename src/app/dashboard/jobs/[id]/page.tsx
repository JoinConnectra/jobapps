"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Eye, Users } from "lucide-react";
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

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user && params.id) {
      fetchJobData();
    }
  }, [session, params.id]);

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

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session?.user || !job) return null;

  const applicationUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/apply/${job.id}`;

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <nav className="bg-white border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Link
            href={`/dashboard/organizations/${job.orgId}`}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Organization
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Job Header */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-display font-bold text-foreground mb-2">
                  {job.title}
                </h1>
                <p className="text-muted-foreground">
                  {job.dept} • {job.locationMode} • {job.salaryRange}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  job.status === "published"
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {job.status}
              </span>
            </div>

            <div className="flex gap-3 mt-6">
              <Link href={`/dashboard/jobs/${job.id}/applications`} className="flex-1">
                <Button variant="outline" className="w-full gap-2">
                  <Users className="w-4 h-4" />
                  View Applications
                </Button>
              </Link>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => window.open(applicationUrl, '_blank')}
              >
                <Eye className="w-4 h-4" />
                Preview
              </Button>
            </div>

            {job.status === "published" && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <Label className="text-sm font-medium text-foreground mb-2 block">
                  Application URL:
                </Label>
                <code className="text-sm bg-white px-3 py-2 rounded border border-border block overflow-x-auto">
                  {applicationUrl}
                </code>
              </div>
            )}
          </div>

          {/* Questions */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-display font-bold text-foreground">
                  Questions
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure voice or text based questions for applicants
                </p>
              </div>
              <Button onClick={addQuestion} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Question
              </Button>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                <p className="text-muted-foreground mb-4">
                  No questions added yet
                </p>
                <Button onClick={addQuestion} variant="outline">
                  Add Your First Question
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((question, index) => (
                  <div
                    key={index}
                    className="p-4 border border-border rounded-lg space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        Question {index + 1}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeQuestion(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div>
                      <Input
                        value={question.prompt}
                        onChange={(e) =>
                          updateQuestion(index, "prompt", e.target.value)
                        }
                        placeholder="e.g., Tell us about your experience with React"
                        className="font-medium"
                      />
                    </div>

                  <div className="flex gap-4 items-center flex-wrap">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Type:</Label>
                      <select
                        value={question.kind || 'voice'}
                        onChange={(e) => updateQuestion(index, 'kind', e.target.value as any)}
                        className="border border-border rounded px-2 py-1"
                      >
                        <option value="voice">Voice</option>
                        <option value="text">Text</option>
                      </select>
                    </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Max Duration:</Label>
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
                          className="w-20"
                          min="30"
                          max="300"
                        />
                        <span className="text-sm text-muted-foreground">
                          seconds
                        </span>
                      </div>
                    {question.kind === 'text' && (
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Max chars:</Label>
                        <Input
                          type="number"
                          value={question.maxChars || 0}
                          onChange={(e) => updateQuestion(index, 'maxChars', parseInt(e.target.value))}
                          className="w-24"
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
                          className="w-4 h-4"
                        />
                        <span className="text-sm">Required</span>
                      </label>
                    </div>
                  </div>
                ))}

                <Button
                  onClick={saveQuestions}
                  disabled={saving}
                  className="w-full"
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
