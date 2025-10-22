"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession, authClient } from "@/lib/auth-client";
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
  Briefcase,
  Search,
  HelpCircle,
  UserPlus,
  LogOut,
  Bell,
  MessageSquare,
  Plus,
} from "lucide-react";
import Link from "next/link";
import CommandPalette from "@/components/CommandPalette";
import { useCommandPalette } from "@/hooks/use-command-palette";

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

interface Reaction {
  id: number;
  answerId: number;
  userId: number;
  reaction: 'like' | 'dislike';
  createdAt: string;
}

interface Comment {
  id: number;
  answerId: number;
  userId: number;
  comment: string;
  createdAt: string;
  userName?: string;
  userEmail?: string;
}

export default function ApplicationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, isPending } = useSession();
  const { isOpen: isCommandPaletteOpen, open: openCommandPalette, close: closeCommandPalette } = useCommandPalette();
  const [application, setApplication] = useState<Application | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingAnswer, setPlayingAnswer] = useState<number | null>(null);
  const [org, setOrg] = useState<{ id: number; name: string } | null>(null);
  const [reactions, setReactions] = useState<Record<number, Reaction[]>>({});
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [newComment, setNewComment] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user && params.id) {
      fetchData();
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
          
          // Fetch reactions and comments for each answer
          for (const answer of answersData) {
            await fetchReactionsAndComments(answer.id);
          }
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

  const fetchReactionsAndComments = async (answerId: number) => {
    try {
      const token = localStorage.getItem("bearer_token");
      
      // Fetch reactions
      const reactionsResponse = await fetch(`/api/answers/${answerId}/reactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (reactionsResponse.ok) {
        const reactionsData = await reactionsResponse.json();
        setReactions(prev => ({ ...prev, [answerId]: reactionsData }));
      }
      
      // Fetch comments
      const commentsResponse = await fetch(`/api/answers/${answerId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (commentsResponse.ok) {
        const commentsData = await commentsResponse.json();
        setComments(prev => ({ ...prev, [answerId]: commentsData }));
      }
    } catch (error) {
      console.error("Failed to fetch reactions/comments:", error);
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

  const handleReaction = async (answerId: number, reaction: 'like' | 'dislike') => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/answers/${answerId}/reactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reaction,
          userId: session?.user?.id || 1, // TODO: Get from session
        }),
      });

      if (response.ok) {
        await fetchReactionsAndComments(answerId);
        toast.success(`Reaction ${reaction}d`);
      } else {
        toast.error("Failed to add reaction");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleAddComment = async (answerId: number) => {
    const comment = newComment[answerId];
    if (!comment.trim()) return;

    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/answers/${answerId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          comment,
          userId: session?.user?.id || 1, // TODO: Get from session
        }),
      });

      if (response.ok) {
        setNewComment(prev => ({ ...prev, [answerId]: "" }));
        await fetchReactionsAndComments(answerId);
        toast.success("Comment added");
      } else {
        toast.error("Failed to add comment");
      }
    } catch (error) {
      toast.error("An error occurred");
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

  if (!session?.user || !application) return null;

  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
      {/* Left Sidebar */}
      <aside className="w-64 bg-[#FEFEFA] border-r border-gray-200 flex flex-col h-screen sticky top-0">
        <div className="p-6">
          <div className="text-xl font-display font-bold text-gray-900 mb-6">{org?.name || "forshadow"}</div>
          
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
            <Button 
              variant="ghost" 
              className="w-full justify-start text-gray-500 text-sm"
              onClick={openCommandPalette}
            >
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
      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto">
        <div className="p-8 max-w-6xl grid grid-cols-1 lg:grid-cols-[1fr_256px] gap-8">
          {/* Main Content Area */}
          <div className="space-y-6">
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
                <Link
                  href={`/dashboard/jobs/${application.jobId}`}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {application.jobTitle}
                </Link>
                <span className="text-gray-400">&gt;</span>
                <span className="text-gray-900 font-medium">{application.applicantEmail}</span>
              </nav>
            </div>

          {/* Application Header */}
          <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-1">
                    {application.applicantEmail}
                  </h2>
                  <p className="text-sm text-gray-500">
                    Applied to: {application.jobTitle}
                  </p>
                  {application.applicantUniversityName && (
                    <p className="text-xs text-green-700 mt-1">
                      University: {application.applicantUniversityName}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-gray-500" />
                    <span className="text-xs text-gray-500">
                      {new Date(application.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <label className="text-xs text-gray-500 block mb-1">
                  Status
                </label>
                <Select value={application.stage} onValueChange={updateStage}>
                  <SelectTrigger className="w-32 text-sm">
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Button
                variant="outline"
                className="gap-2 text-sm"
                onClick={() => handleQuickAction("move_to_phone")}
              >
                <Phone className="w-3 h-3" />
                Move to Phone Screen
              </Button>
              <Button
                variant="outline"
                className="gap-2 text-sm"
                onClick={() => handleQuickAction("email_sent")}
              >
                <Mail className="w-3 h-3" />
                Send Email
              </Button>
              <Button
                variant="outline"
                className="gap-2 text-sm text-green-600 hover:text-green-700"
              >
                <ThumbsUp className="w-3 h-3" />
                Approve
              </Button>
              <Button
                variant="outline"
                className="gap-2 text-sm text-red-600 hover:text-red-700"
                onClick={() => handleQuickAction("reject")}
              >
                <X className="w-3 h-3" />
                Reject
              </Button>
            </div>
          </div>

          {/* Voice Answers */}
          <div className="bg-white rounded-lg shadow-sm p-5 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Voice Answers
            </h2>

            {answers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">No voice answers recorded</p>
              </div>
            ) : (
              <div className="space-y-4">
                {answers.map((answer, index) => {
                  const question = questions.find((q) => q.id === answer.questionId);
                  
                  return (
                    <div
                      key={answer.id}
                      className="p-4 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 mb-1">
                            Question {index + 1}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {question?.prompt || "Question not found"}
                          </p>
                        </div>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                          {answer.durationSec}s
                        </span>
                      </div>

                      {/* Audio Player Placeholder */}
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPlayingAnswer(answer.id)}
                            className="text-xs"
                          >
                            {playingAnswer === answer.id ? (
                              <Pause className="w-3 h-3" />
                            ) : (
                              <Play className="w-3 h-3" />
                            )}
                          </Button>
                          <div className="flex-1">
                            <div className="h-1.5 bg-orange-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-orange-500 rounded-full"
                                style={{ width: "0%" }}
                              />
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">
                            0:00 / {Math.floor(answer.durationSec / 60)}:
                            {(answer.durationSec % 60).toString().padStart(2, "0")}
                          </span>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-500 mb-1">
                            <strong>Transcript:</strong> (AI transcription pending)
                          </p>
                          <p className="text-xs text-gray-500 italic">
                            Audio file: {answer.audioS3Key}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-1 text-xs"
                          onClick={() => handleReaction(answer.id, 'like')}
                        >
                          <ThumbsUp className="w-3 h-3" />
                          Like
                          {reactions[answer.id]?.filter(r => r.reaction === 'like').length > 0 && (
                            <span className="ml-1 text-green-600">
                              ({reactions[answer.id]?.filter(r => r.reaction === 'like').length})
                            </span>
                          )}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="gap-1 text-xs"
                          onClick={() => handleReaction(answer.id, 'dislike')}
                        >
                          <ThumbsDown className="w-3 h-3" />
                          Dislike
                          {reactions[answer.id]?.filter(r => r.reaction === 'dislike').length > 0 && (
                            <span className="ml-1 text-red-600">
                              ({reactions[answer.id]?.filter(r => r.reaction === 'dislike').length})
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Analysis Placeholder */}
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg shadow-sm p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-orange-600" />
              <h2 className="text-lg font-medium text-gray-900">
                AI Analysis
              </h2>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Generate an AI-powered summary of this candidate's responses
            </p>
            <Button className="gap-2 text-sm">
              <Sparkles className="w-3 h-3" />
              Generate Summary
            </Button>
          </div>
          </div>

          {/* Right Sidebar - Activity */}
          <aside className="w-64 bg-[#FEFEFA] border-l border-gray-200 flex flex-col h-screen sticky top-0">
            <div className="p-6 flex flex-col h-full overflow-hidden">
              <h2 className="text-lg font-semibold mb-6">Activity</h2>

              {/* Comments Section */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="space-y-4">
                  {answers.map((answer, index) => {
                    const question = questions.find((q) => q.id === answer.questionId);
                    const answerComments = comments[answer.id] || [];
                    
                    return (
                      <div key={answer.id} className="space-y-3">
                        {/* Question Header */}
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm font-medium text-gray-900 mb-2 break-words">
                            {question?.prompt || `Question ${index + 1}`}
                          </p>
                        </div>

                        {/* Comments */}
                        {answerComments.length > 0 && (
                          <div className="space-y-2">
                            {answerComments.map((comment) => (
                              <div key={comment.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-medium text-gray-600">
                                    {comment.userName?.charAt(0) || 'U'}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline justify-between mb-1">
                                    <p className="text-xs font-semibold text-gray-900 truncate">
                                      {comment.userName || 'User'}
                                    </p>
                                    <p className="text-xs text-gray-400 flex-shrink-0 ml-2">
                                      {new Date(comment.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <p className="text-xs text-gray-700 break-words">{comment.comment}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add Comment */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Add a comment..."
                            value={newComment[answer.id] || ''}
                            onChange={(e) => setNewComment(prev => ({ ...prev, [answer.id]: e.target.value }))}
                            className="flex-1 text-xs px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0"
                          />
                          <Button
                            size="sm"
                            onClick={() => handleAddComment(answer.id)}
                            className="text-xs px-3 py-2 flex-shrink-0"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
      
      <CommandPalette 
        isOpen={isCommandPaletteOpen} 
        onClose={closeCommandPalette}
        orgId={org?.id}
      />
    </div>
  );
}