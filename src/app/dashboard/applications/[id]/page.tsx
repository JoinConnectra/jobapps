"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft,
  Play,
  Pause,
  ThumbsUp,
  ThumbsDown,
  Mail,
  Phone,
  X,
  Sparkles,
  Clock,
  User,
} from "lucide-react";
import Link from "next/link";

interface Application {
  id: number;
  jobId: number;
  applicantEmail: string;
  stage: string;
  source: string | null;
  createdAt: string;
  jobTitle: string;
  applicantUniversityId?: number | null;
  applicantUniversityName?: string | null;
}

interface Answer {
  id: number;
  questionId: number;
  audioS3Key: string;
  durationSec: number;
}

interface Question {
  id: number;
  prompt: string;
}

export default function ApplicationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, isPending } = useSession();
  const [application, setApplication] = useState<Application | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingAnswer, setPlayingAnswer] = useState<number | null>(null);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user && params.id) {
      fetchData();
    }
  }, [session, params.id]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("bearer_token");

      // Fetch application
      const appResponse = await fetch(`/api/applications?id=${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (appResponse.ok) {
        const appData = await appResponse.json();
        setApplication(appData);

        // Fetch answers
        const answersResponse = await fetch(
          `/api/answers?applicationId=${params.id}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (answersResponse.ok) {
          const answersData = await answersResponse.json();
          setAnswers(answersData);
        }

        // Fetch questions
        const questionsResponse = await fetch(
          `/api/jobs/${appData.jobId}/questions`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (questionsResponse.ok) {
          const questionsData = await questionsResponse.json();
          setQuestions(questionsData);
        }
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStage = async (newStage: string) => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/applications/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stage: newStage }),
      });

      if (response.ok) {
        toast.success("Stage updated successfully");
        setApplication((prev) => (prev ? { ...prev, stage: newStage } : null));
      } else {
        toast.error("Failed to update stage");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleQuickAction = async (action: string) => {
    const token = localStorage.getItem("bearer_token");

    try {
      const response = await fetch(
        `/api/applications/${params.id}/actions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            type: action,
            createdBy: 1, // TODO: Get from session
          }),
        }
      );

      if (response.ok) {
        toast.success(`Action "${action}" recorded`);
        
        if (action === "reject") {
          updateStage("rejected");
        } else if (action === "move_to_phone") {
          updateStage("phone_screen");
        }
      } else {
        toast.error("Failed to perform action");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session?.user || !application) return null;

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <nav className="bg-white border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Link
            href={`/dashboard/jobs/${application.jobId}/applications`}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Applications
          </Link>
        </div>
      </nav>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Application Header */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-display font-bold text-foreground mb-1">
                    {application.applicantEmail}
                  </h1>
                  <p className="text-muted-foreground">
                    Applied to: {application.jobTitle}
                  </p>
                  {application.applicantUniversityName && (
                    <p className="text-sm text-green-700 mt-1">
                      University: {application.applicantUniversityName}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {new Date(application.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <label className="text-sm text-muted-foreground block mb-2">
                  Status
                </label>
                <Select value={application.stage} onValueChange={updateStage}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="reviewing">Reviewing</SelectItem>
                    <SelectItem value="phone_screen">Phone Screen</SelectItem>
                    <SelectItem value="onsite">Onsite</SelectItem>
                    <SelectItem value="offer">Offer</SelectItem>
                    <SelectItem value="hired">Hired</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => handleQuickAction("move_to_phone")}
              >
                <Phone className="w-4 h-4" />
                Move to Phone Screen
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => handleQuickAction("email_sent")}
              >
                <Mail className="w-4 h-4" />
                Send Email
              </Button>
              <Button
                variant="outline"
                className="gap-2 text-green-600 hover:text-green-700"
              >
                <ThumbsUp className="w-4 h-4" />
                Approve
              </Button>
              <Button
                variant="outline"
                className="gap-2 text-destructive hover:text-destructive"
                onClick={() => handleQuickAction("reject")}
              >
                <X className="w-4 h-4" />
                Reject
              </Button>
            </div>
          </div>

          {/* Voice Answers */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-display font-bold text-foreground mb-6">
              Voice Answers
            </h2>

            {answers.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No voice answers recorded</p>
              </div>
            ) : (
              <div className="space-y-6">
                {answers.map((answer, index) => {
                  const question = questions.find((q) => q.id === answer.questionId);
                  
                  return (
                    <div
                      key={answer.id}
                      className="p-6 border-2 border-border rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">
                            Question {index + 1}
                          </h3>
                          <p className="text-muted-foreground">
                            {question?.prompt || "Question not found"}
                          </p>
                        </div>
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {answer.durationSec}s
                        </span>
                      </div>

                      {/* Audio Player Placeholder */}
                      <div className="bg-muted/50 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPlayingAnswer(answer.id)}
                          >
                            {playingAnswer === answer.id ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          <div className="flex-1">
                            <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: "0%" }}
                              />
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            0:00 / {Math.floor(answer.durationSec / 60)}:
                            {(answer.durationSec % 60).toString().padStart(2, "0")}
                          </span>
                        </div>

                        <div className="mt-4 pt-4 border-t border-border">
                          <p className="text-sm text-muted-foreground mb-2">
                            <strong>Transcript:</strong> (AI transcription pending)
                          </p>
                          <p className="text-sm text-muted-foreground italic">
                            Audio file: {answer.audioS3Key}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-4">
                        <Button variant="ghost" size="sm" className="gap-1">
                          <ThumbsUp className="w-3 h-3" />
                          Like
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-1">
                          <ThumbsDown className="w-3 h-3" />
                          Dislike
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Analysis Placeholder */}
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl shadow-lg p-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-display font-bold text-foreground">
                AI Analysis
              </h2>
            </div>
            <p className="text-muted-foreground mb-4">
              Generate an AI-powered summary of this candidate's responses
            </p>
            <Button className="gap-2">
              <Sparkles className="w-4 h-4" />
              Generate Summary
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
