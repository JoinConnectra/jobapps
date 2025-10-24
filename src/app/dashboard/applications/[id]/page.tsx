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
  MessageSquare, ListChecks,
  Plus,
  Trash2,
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
  const [audioElements, setAudioElements] = useState<Record<number, HTMLAudioElement>>({});
  const [currentTime, setCurrentTime] = useState<Record<number, number>>({});
  const [org, setOrg] = useState<{ id: number; name: string } | null>(null);
  const [reactions, setReactions] = useState<Record<number, Reaction[]>>({});
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [newComment, setNewComment] = useState<Record<number, string>>({});
  const [showCommentPrompt, setShowCommentPrompt] = useState<Record<number, boolean>>({});
  const [pendingReaction, setPendingReaction] = useState<Record<number, 'like' | 'dislike' | null>>({});

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

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      Object.values(audioElements).forEach(audio => {
        if (audio) {
          audio.pause();
          audio.src = '';
        }
      });
    };
  }, [audioElements]);

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
          console.log('Loaded answers:', answersData);
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
      // Check if user is authenticated
      if (!session?.user?.id) {
        toast.error("Please log in to react to answers");
        return;
      }
      
      const token = localStorage.getItem("bearer_token");
      const userId = session.user.id;
      
      console.log('Reaction request:', {
        answerId,
        reaction,
        userId,
        token: token ? 'present' : 'missing',
        session: session?.user,
        isPending,
        hasSession: !!session
      });
      
      const response = await fetch(`/api/answers/${answerId}/reactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reaction,
        }),
      });

      console.log('Reaction response:', response.status, response.statusText);
      
      if (response.ok) {
        await fetchReactionsAndComments(answerId);
        
        // Store the reaction and show comment prompt
        setPendingReaction(prev => ({ ...prev, [answerId]: reaction }));
        setShowCommentPrompt(prev => ({ ...prev, [answerId]: true }));
        
        toast.success(`Reaction ${reaction}d - Please add a comment explaining your feedback`);
      } else {
        const errorText = await response.text();
        console.error('Reaction error response:', errorText);
        toast.error("Failed to add reaction");
      }
    } catch (error) {
      console.error('Reaction error:', error);
      toast.error("An error occurred");
    }
  };

  const handleAddComment = async (answerId: number) => {
    const comment = newComment[answerId];
    if (!comment.trim()) return;

    // Check if user is authenticated
    if (!session?.user?.id) {
      toast.error("Please log in to add comments");
      return;
    }

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
        }),
      });

      if (response.ok) {
        setNewComment(prev => ({ ...prev, [answerId]: "" }));
        setShowCommentPrompt(prev => ({ ...prev, [answerId]: false }));
        setPendingReaction(prev => ({ ...prev, [answerId]: null }));
        await fetchReactionsAndComments(answerId);
        toast.success("Comment added");
      } else {
        toast.error("Failed to add comment");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleDeleteComment = async (commentId: number, answerId: number) => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/answers/${answerId}/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchReactionsAndComments(answerId);
        toast.success("Comment deleted");
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || "Failed to delete comment");
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

  // Audio playback functions
  const toggleAudio = async (answerId: number, audioS3Key: string) => {
    console.log('toggleAudio called:', { answerId, audioS3Key });
    
    try {
      // If this answer is currently playing, pause it
      if (playingAnswer === answerId) {
        const audio = audioElements[answerId];
        if (audio) {
          audio.pause();
          setPlayingAnswer(null);
        }
        return;
      }

      // Stop any currently playing audio
      if (playingAnswer) {
        const currentAudio = audioElements[playingAnswer];
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
      }

      // Create new audio element if it doesn't exist
      let audio = audioElements[answerId];
      if (!audio) {
        audio = new Audio();
        audio.preload = 'metadata';
        
        // Set up event listeners
        audio.addEventListener('timeupdate', () => {
          setCurrentTime(prev => ({ ...prev, [answerId]: audio.currentTime }));
        });
        
        audio.addEventListener('ended', () => {
          setPlayingAnswer(null);
          setCurrentTime(prev => ({ ...prev, [answerId]: 0 }));
        });
        
        audio.addEventListener('error', (e) => {
          console.error('Audio error:', e);
          console.error('Audio src:', audio.src);
          console.error('Audio networkState:', audio.networkState);
          console.error('Audio readyState:', audio.readyState);
          toast.error('Failed to load audio file');
          setPlayingAnswer(null);
        });
        
        audio.addEventListener('loadstart', () => {
          console.log('Audio load started');
        });
        
        audio.addEventListener('loadedmetadata', () => {
          console.log('Audio metadata loaded, duration:', audio.duration);
        });
        
        audio.addEventListener('canplay', () => {
          console.log('Audio can play, duration:', audio.duration);
          // Update the duration in state if we have a valid duration
          if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
            setCurrentTime(prev => ({ ...prev, [answerId]: 0 }));
          }
        });
        
        audio.addEventListener('loadeddata', () => {
          console.log('Audio data loaded');
        });

        setAudioElements(prev => ({ ...prev, [answerId]: audio }));
      }

      // Set the audio source and wait for it to load
      // Check if it's a real audio URL or a mock S3 key
      if (audioS3Key && audioS3Key.startsWith('/uploads/audio/')) {
        // It's a real audio file URL
        audio.src = audioS3Key;
        console.log('Loading real audio from:', audio.src);
      } else {
        // It's a mock S3 key, use our fallback API
        audio.src = `/api/audio/${encodeURIComponent(audioS3Key)}`;
        console.log('Loading mock audio from:', audio.src);
      }
      audio.currentTime = currentTime[answerId] || 0;
      
      // Wait for the audio to be ready before playing
      return new Promise((resolve, reject) => {
        const handleCanPlay = () => {
          console.log('Audio ready to play');
          audio.removeEventListener('canplay', handleCanPlay);
          audio.removeEventListener('error', handleError);
          audio.play().then(() => {
            setPlayingAnswer(answerId);
            resolve(true);
          }).catch(reject);
        };
        
        const handleError = (e: Event) => {
          console.error('Audio failed to load:', e);
          console.error('Audio src:', audio.src);
          console.error('Audio networkState:', audio.networkState);
          console.error('Audio readyState:', audio.readyState);
          audio.removeEventListener('canplay', handleCanPlay);
          audio.removeEventListener('error', handleError);
          toast.error('Failed to load audio file');
          setPlayingAnswer(null);
          reject(e);
        };
        
        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('error', handleError);
        
        // Add a timeout to prevent hanging
        const timeout = setTimeout(() => {
          console.error('Audio loading timeout');
          audio.removeEventListener('canplay', handleCanPlay);
          audio.removeEventListener('error', handleError);
          toast.error('Audio loading timeout');
          setPlayingAnswer(null);
          reject(new Error('Audio loading timeout'));
        }, 10000); // 10 second timeout
        
        // Clear timeout when audio loads successfully
        const originalHandleCanPlay = handleCanPlay;
        const originalHandleError = handleError;
        
        const wrappedHandleCanPlay = () => {
          clearTimeout(timeout);
          originalHandleCanPlay();
        };
        
        const wrappedHandleError = (e: Event) => {
          clearTimeout(timeout);
          originalHandleError(e);
        };
        
        audio.removeEventListener('canplay', handleCanPlay);
        audio.removeEventListener('error', handleError);
        audio.addEventListener('canplay', wrappedHandleCanPlay);
        audio.addEventListener('error', wrappedHandleError);
        
        // Start loading the audio
        audio.load();
      });
      
    } catch (error) {
      console.error('Error playing audio:', error);
      toast.error('Failed to play audio');
      setPlayingAnswer(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
            <Button
                          variant="ghost"
                          className="w-full justify-start text-gray-700 hover:bg-[#F5F1E8] hover:text-gray-900"
                          disabled={!org?.id}
                          title={!org?.id ? "Select or create an organization first" : "Assessments"}
                          onClick={() =>
                            org?.id && router.push(`/dashboard/organizations/${org.id}/assessments`)
                          }
                        >
                          <ListChecks className="w-4 h-4 mr-3" />
                          Assessments
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
                      className="bg-gray-50 rounded-lg p-4 flex items-center gap-4"
                    >
                      {/* Play Button */}
                      <button
                        onClick={() => toggleAudio(answer.id, answer.audioS3Key)}
                        className="w-10 h-10 bg-white rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors"
                      >
                        {playingAnswer === answer.id ? (
                          <Pause className="w-4 h-4 text-gray-700" />
                        ) : (
                          <Play className="w-4 h-4 text-gray-700 ml-0.5" />
                        )}
                      </button>

                      {/* Question Content */}
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">
                          {question?.prompt || "Question not found"}
                        </h3>
                        <p className="text-xs text-gray-600">
                          Feel free to get technical here!
                        </p>
                      </div>

                      {/* Duration and Actions */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-500">
                          {formatTime(currentTime[answer.id] || 0)} / {formatTime(
                            audioElements[answer.id]?.duration || answer.durationSec || 0
                          )}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleReaction(answer.id, 'like')}
                            className={`p-1 hover:bg-gray-200 rounded transition-colors ${
                              pendingReaction[answer.id] === 'like' ? 'bg-green-100' : ''
                            }`}
                          >
                            <ThumbsUp className={`w-4 h-4 ${
                              pendingReaction[answer.id] === 'like' ? 'text-green-600' : 'text-gray-500'
                            }`} />
                          </button>
                          <button
                            onClick={() => handleReaction(answer.id, 'dislike')}
                            className={`p-1 hover:bg-gray-200 rounded transition-colors ${
                              pendingReaction[answer.id] === 'dislike' ? 'bg-red-100' : ''
                            }`}
                          >
                            <ThumbsDown className={`w-4 h-4 ${
                              pendingReaction[answer.id] === 'dislike' ? 'text-red-600' : 'text-gray-500'
                            }`} />
                          </button>
                        </div>
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
          <aside className="w-80 bg-[#FEFEFA] border-l border-gray-200 flex flex-col h-screen sticky top-0">
            <div className="p-4 flex flex-col h-full overflow-hidden">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">Activity</h2>

              {/* Comments Section */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="space-y-4">
                  {answers.map((answer, index) => {
                    const question = questions.find((q) => q.id === answer.questionId);
                    const answerComments = comments[answer.id] || [];
                    
                    return (
                      <div key={answer.id} className="space-y-3">
                        {/* Reaction Display */}
                        {reactions[answer.id] && reactions[answer.id].length > 0 && (
                          <div className="space-y-2">
                            {reactions[answer.id].map((reaction) => (
                              <div key={reaction.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2 flex-1">
                                  {reaction.reaction === 'like' ? (
                                    <ThumbsUp className="w-4 h-4 text-green-600" />
                                  ) : (
                                    <ThumbsDown className="w-4 h-4 text-red-600" />
                                  )}
                                  <span className="text-sm font-medium text-gray-900">
                                    You {reaction.reaction}d this answer
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500 flex-shrink-0">
                                  {new Date(reaction.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Comments */}
                        {answerComments.length > 0 && (
                          <div className="space-y-2">
                            {answerComments.map((comment) => (
                              <div key={comment.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                <div className="w-7 h-7 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-medium text-gray-600">
                                    {comment.userName?.charAt(0) || 'U'}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between mb-1">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-gray-900 truncate">
                                        {comment.userName || 'User'}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        Employer
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                      <p className="text-xs text-gray-400">
                                        {new Date(comment.createdAt).toLocaleDateString()}
                                      </p>
                                      {/* Only show delete button for current user's comments */}
                                      {comment.userEmail === session?.user?.email && (
                                        <button
                                          onClick={() => handleDeleteComment(comment.id, answer.id)}
                                          className="p-1 hover:bg-red-100 rounded transition-colors"
                                          title="Delete comment"
                                        >
                                          <Trash2 className="w-3 h-3 text-red-500" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-sm text-gray-700 break-words mt-1">{comment.comment}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Reaction Comment Prompt */}
                        {showCommentPrompt[answer.id] && pendingReaction[answer.id] && (
                          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                {pendingReaction[answer.id] === 'like' ? (
                                  <ThumbsUp className="w-3 h-3 text-white" />
                                ) : (
                                  <ThumbsDown className="w-3 h-3 text-white" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-blue-900">
                                    {session?.user?.name || 'You'}
                                  </span>
                                  <span className="text-xs text-blue-700">
                                    {pendingReaction[answer.id]}d this answer
                                  </span>
                                </div>
                                <p className="text-xs text-blue-600 mt-1">
                                  Please explain your feedback.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Add Comment */}
                        <div className="flex gap-2 mt-3">
                          <input
                            type="text"
                            placeholder={showCommentPrompt[answer.id] ? `Explain why you ${pendingReaction[answer.id]}d this answer...` : "Add a comment..."}
                            value={newComment[answer.id] || ''}
                            onChange={(e) => setNewComment(prev => ({ ...prev, [answer.id]: e.target.value }))}
                            className={`flex-1 text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 min-w-0 ${
                              showCommentPrompt[answer.id] 
                                ? 'border-blue-300 focus:ring-blue-500 bg-blue-50' 
                                : 'border-gray-300 focus:ring-blue-500'
                            }`}
                          />
                          <Button
                            size="sm"
                            onClick={() => handleAddComment(answer.id)}
                            className={`px-3 py-2 flex-shrink-0 ${
                              showCommentPrompt[answer.id] 
                                ? 'bg-blue-600 hover:bg-blue-700' 
                                : 'bg-gray-600 hover:bg-gray-700'
                            }`}
                          >
                            <Plus className="w-4 h-4" />
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