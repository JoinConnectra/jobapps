"use client";

import { useEffect, useState, useMemo } from "react";
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Play,
  Pause,
  ThumbsUp,
  BarChartIcon,
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
  ListChecks,
  Plus,
  Trash2,
  Settings,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import CommandPalette from "@/components/CommandPalette";
import SettingsModal from "@/components/SettingsModal";
import CompanySidebar from "@/components/company/CompanySidebar";
import { useCommandPalette } from "@/hooks/use-command-palette";

const formatDateTime = (value: string) => {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

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

  // NEW fields
  applicantName?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  location?: string | null;
  city?: string | null;
  province?: string | null;
  cnic?: string | null;

  linkedinUrl?: string | null;
  portfolioUrl?: string | null;
  githubUrl?: string | null;

  workAuth?: string | null;
  needSponsorship?: boolean | null;
  willingRelocate?: boolean | null;
  remotePref?: string | null;
  earliestStart?: string | null;
  salaryExpectation?: string | null;

  expectedSalaryPkr?: number | null;
  noticePeriodDays?: number | null;
  experienceYears?: string | null;

  university?: string | null;
  degree?: string | null;
  graduationYear?: number | null;
  gpa?: string | null;
  gpaScale?: string | null;

  // Resume
  resumeS3Key?: string | null;
  resumeFilename?: string | null;
  resumeMime?: string | null;
  resumeSize?: number | null;
}

interface Answer {
  id: number;
  questionId: number;
  audioS3Key: string | null;
  durationSec: number | null;
  applicationId: number;
}

interface Question {
  id: number;
  prompt: string;
}

interface Reaction {
  id: number;
  answerId: number;
  applicationId: number;
  jobId: number | null;
  userId: number;
  reaction: "like" | "dislike";
  createdAt: string;
  updatedAt?: string;
  explanation: string;
  userName?: string | null;
  userEmail?: string | null;
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

type ReactionDialogState = {
  open: boolean;
  answerId: number | null;
  reaction: "like" | "dislike" | null;
  explanation: string;
  isSaving: boolean;
};

type AssessmentRow = {
  id: number;
  title: string;
  type: string;
  duration: string;
  status: string;
};

type AppAssignmentRow = {
  id: number;
  assessmentId: number;
  status: string;
  dueAt: string | null;
  invitedAt: string | null;
  startedAt: string | null;
  submittedAt: string | null;
  score: number | null;
  resultJson: any;
  createdAt: string;
  assessmentTitle: string;
  assessmentType: string;
  assessmentDuration: string;
};

export default function ApplicationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const applicationId = useMemo(
    () => Number(Array.isArray(params?.id) ? params?.id?.[0] : params?.id),
    [params]
  );

  const { data: session, isPending } = useSession();
  const { isOpen: isCommandPaletteOpen, open: openCommandPalette, close: closeCommandPalette } = useCommandPalette();
  const [application, setApplication] = useState<Application | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingAnswer, setPlayingAnswer] = useState<number | null>(null);
  const [audioElements, setAudioElements] = useState<Record<number, HTMLAudioElement>>({});
  const [currentTime, setCurrentTime] = useState<Record<number, number>>({});
  const [org, setOrg] = useState<{ id: number; name: string; logoUrl?: string | null } | null>(null);
  const [reactions, setReactions] = useState<Record<number, Reaction[]>>({});
  const [comments, setComments] = useState<Record<number, Comment[]>>({});
  const [newComment, setNewComment] = useState<Record<number, string>>({});
  const [reactionDialog, setReactionDialog] = useState<ReactionDialogState>({
    open: false,
    answerId: null,
    reaction: null,
    explanation: "",
    isSaving: false,
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Assign Assessment dialog state
  const [assignOpen, setAssignOpen] = useState(false);
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [assignments, setAssignments] = useState<AppAssignmentRow[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>("");
  const [dueAt, setDueAt] = useState<string>("");
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [isCandidateDetailsExpanded, setIsCandidateDetailsExpanded] = useState(false);
  const orgIdForAssessments = org?.id ?? null;

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

  useEffect(() => {
    if (orgIdForAssessments) {
      loadAssessments(orgIdForAssessments);
    }
  }, [orgIdForAssessments]);

  useEffect(() => {
    if (applicationId) {
      loadAssignments(applicationId);
    }
  }, [applicationId]);

  useEffect(() => {
    return () => {
      Object.values(audioElements).forEach((audio) => {
        if (audio) {
          audio.pause();
          audio.src = "";
        }
      });
    };
  }, [audioElements]);

  // Note: Preloading disabled to avoid src conflicts. Audio elements are created on-demand when play is clicked.

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
        const answersResponse = await fetch(`/api/answers?applicationId=${params.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (answersResponse.ok) {
          const answersData = await answersResponse.json();
          console.log("Fetched answers:", answersData);
          // Log each answer's audioS3Key to debug
          answersData.forEach((answer: Answer) => {
            console.log(`Answer ${answer.id} audioS3Key:`, answer.audioS3Key, "type:", typeof answer.audioS3Key, "isNull:", answer.audioS3Key === null, "isEmpty:", answer.audioS3Key === '');
          });
          setAnswers(answersData);

          // Fetch reactions and comments for each answer
          for (const answer of answersData) {
            await fetchReactionsAndComments(answer.id, {
              applicationId: appData.id,
              jobId: appData.jobId,
            });
          }
        }

        // Fetch questions
        const questionsResponse = await fetch(`/api/jobs/${appData.jobId}/questions`, {
          headers: { Authorization: `Bearer ${token}` },
        });

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

  const loadAssessments = async (orgId: number) => {
    try {
      const token = localStorage.getItem("bearer_token");
      const resp = await fetch(`/api/assessments?orgId=${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    if (resp.ok) {
        const rows: AssessmentRow[] = await resp.json();
        setAssessments(rows);
      }
    } catch (e) {
      console.error("Failed to load assessments:", e);
    }
  };

  const loadAssignments = async (appId: number) => {
    try {
      const token = localStorage.getItem("bearer_token");
      const resp = await fetch(`/api/applications/${appId}/assessments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const rows: AppAssignmentRow[] = await resp.json();
        setAssignments(rows);
      }
    } catch (e) {
      console.error("Failed to load application assignments:", e);
    }
  };

  const handleDeleteAssignment = async (assignmentId: number) => {
    if (!applicationId) return;
    
    try {
      const token = localStorage.getItem("bearer_token");
      const resp = await fetch(
        `/api/applications/${applicationId}/assessments?assignmentId=${assignmentId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (resp.ok) {
        toast.success("Assessment assignment revoked");
        await loadAssignments(applicationId);
      } else {
        const error = await resp.json().catch(() => ({ error: { message: "Failed to revoke assignment" } }));
        toast.error(error.error?.message || "Failed to revoke assignment");
      }
    } catch (e) {
      console.error("Failed to delete assignment:", e);
      toast.error("Failed to revoke assignment");
    }
  };

  const fetchReactionsAndComments = async (
    answerId: number,
    options?: { applicationId?: number | null; jobId?: number | null },
  ) => {
    try {
      const token = localStorage.getItem("bearer_token");

      const searchParams = new URLSearchParams();
      if (options?.applicationId) {
        searchParams.set("applicationId", String(options.applicationId));
      }
      if (options?.jobId) {
        searchParams.set("jobId", String(options.jobId));
      }

      const reactionsUrl = `/api/answers/${answerId}/reactions${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

      const reactionsResponse = await fetch(reactionsUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (reactionsResponse.ok) {
        const reactionsData = await reactionsResponse.json();
        setReactions((prev) => ({ ...prev, [answerId]: reactionsData }));
      }

      const commentsResponse = await fetch(`/api/answers/${answerId}/comments`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (commentsResponse.ok) {
        const commentsData = await commentsResponse.json();
        setComments((prev) => ({ ...prev, [answerId]: commentsData }));
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
      const response = await fetch(`/api/applications/${params.id}/actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: action,
          createdBy: 1, // TODO: Get from session
        }),
      });

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

  const handleSendEmail = () => {
    if (!application?.applicantEmail) {
      toast.error("Applicant email not available");
      return;
    }

    // Get company name from the logged-in user's organization (fetched via /api/organizations?mine=true)
    // This ensures each company sees their own company name in the email subject
    const companyName = org?.name || "Our Company";
    
    // Get job title from the application
    const jobTitle = application?.jobTitle || "job application";
    
    // Create professional subject line customized for the logged-in company and job title
    const subject = encodeURIComponent(`${companyName}: Update on your ${jobTitle} application`);
    
    // Create mailto URL - works on both macOS and Windows
    const mailtoUrl = `mailto:${application.applicantEmail}?subject=${subject}`;
    
    // Open default email client using anchor element (works reliably on both macOS and Windows)
    const link = document.createElement("a");
    link.href = mailtoUrl;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Record the action for tracking (non-blocking)
    setTimeout(() => {
      handleQuickAction("email_sent").catch(() => {
        // Silently fail if action recording fails - email opening is more important
      });
    }, 100);
  };

  const openReactionDialog = (answerId: number, reaction: "like" | "dislike") => {
      if (!session?.user?.id) {
        toast.error("Please log in to react to answers");
        return;
      }

    const existingReactions = reactions[answerId] || [];
    const currentUserReaction = existingReactions.find(
      (r) => r.userEmail === session.user?.email || r.userId === session.user?.id,
    );

    setReactionDialog({
      open: true,
      answerId,
      reaction,
      explanation: currentUserReaction?.explanation ?? "",
      isSaving: false,
    });
  };

  const resetReactionDialog = () => {
    setReactionDialog({
      open: false,
      answerId: null,
      reaction: null,
      explanation: "",
      isSaving: false,
    });
  };

  const handleSaveReaction = async () => {
    if (!reactionDialog.answerId || !reactionDialog.reaction) {
      return;
    }

    const explanation = reactionDialog.explanation.trim();
    if (!explanation) {
      toast.error("Please add a brief explanation before saving.");
      return;
    }

    try {
      setReactionDialog((prev) => ({ ...prev, isSaving: true }));
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/answers/${reactionDialog.answerId}/reactions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reaction: reactionDialog.reaction,
          explanation,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error || "Failed to save feedback");
        return;
      }

      await fetchReactionsAndComments(reactionDialog.answerId, {
        applicationId: application?.id ?? null,
        jobId: application?.jobId ?? null,
      });
      toast.success("Feedback saved");
      resetReactionDialog();
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while saving feedback");
    } finally {
      setReactionDialog((prev) => ({ ...prev, isSaving: false }));
    }
  };

  const handleCancelReaction = () => {
    if (reactionDialog.isSaving) return;
    resetReactionDialog();
  };

  const handleAddComment = async (answerId: number) => {
    const comment = newComment[answerId];
    if (!comment?.trim()) return;

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
        body: JSON.stringify({ comment }),
      });

      if (response.ok) {
        setNewComment((prev) => ({ ...prev, [answerId]: "" }));
        await fetchReactionsAndComments(answerId, {
          applicationId: application?.id ?? null,
          jobId: application?.jobId ?? null,
        });
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
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        await fetchReactionsAndComments(answerId, {
          applicationId: application?.id ?? null,
          jobId: application?.jobId ?? null,
        });
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

  // Assign assessment handler
  const handleAssignAssessment = async () => {
    if (!selectedAssessmentId || !applicationId) return;
    setAssignSubmitting(true);
    try {
      const token = localStorage.getItem("bearer_token");
      const resp = await fetch(`/api/applications/${applicationId}/assessments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assessmentId: Number(selectedAssessmentId),
          dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        }),
      });

      if (resp.ok) {
        toast.success("Assessment assigned");
        await loadAssignments(applicationId);

        if (application?.stage !== "assessment") {
          await updateStage("assessment");
        }

        setAssignOpen(false);
        setSelectedAssessmentId("");
        setDueAt("");
      } else {
        toast.error("Failed to assign assessment");
      }
    } catch (e) {
      toast.error("An error occurred");
    } finally {
      setAssignSubmitting(false);
    }
  };

  // Download resume (signed URL)
  const handleDownloadResume = async () => {
    if (!application) return;
    try {
      const res = await fetch(`/api/applications/${application.id}/resume`, { method: "GET" });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error || "No resume available");
        return;
      }
      const { signedUrl } = await res.json();
      if (signedUrl) {
        window.open(signedUrl, "_blank");
      } else {
        toast.error("No resume URL");
      }
    } catch {
      toast.error("Failed to download resume");
    }
  };

  // Audio
  const toggleAudio = async (answerId: number, audioS3Key: string | null) => {
    try {
      // Check if audio key exists
      if (!audioS3Key || audioS3Key.trim() === '') {
        toast.error("No audio file available for this answer");
        return;
      }

      if (playingAnswer === answerId) {
        const audio = audioElements[answerId];
        if (audio) {
          audio.pause();
          setPlayingAnswer(null);
        }
        return;
      }

      if (playingAnswer) {
        const currentAudio = audioElements[playingAnswer];
        if (currentAudio) {
          currentAudio.pause();
          currentAudio.currentTime = 0;
        }
      }

      // Determine the audio source URL FIRST, before creating audio element
      let audioSrc: string;
      if (audioS3Key.startsWith("/uploads/audio/")) {
        audioSrc = audioS3Key;
      } else {
        audioSrc = `/api/audio/${encodeURIComponent(audioS3Key)}`;
      }

      // Validate src before doing anything
      if (!audioSrc || audioSrc.trim() === '' || audioSrc === '/api/audio/') {
        console.error("Invalid audio file path:", audioSrc, "from audioS3Key:", audioS3Key);
        toast.error("Invalid audio file path");
        return;
      }

      console.log("Loading audio from:", audioSrc, "for answer", answerId, "audioS3Key:", audioS3Key);

      // Always create a fresh audio element to avoid src conflicts
      let audio = new Audio();
      audio.preload = "auto";

      // Set src FIRST before anything else
      try {
        audio.src = audioSrc;
        
        // Immediately verify src was set correctly
        const actualSrc = audio.src;
        if (!actualSrc || 
            actualSrc === window.location.href || 
            (!actualSrc.includes(audioSrc) && !actualSrc.includes('uploads/audio'))) {
          console.error("Failed to set audio src. Expected:", audioSrc, "Got:", actualSrc);
          toast.error("Failed to set audio source");
          return;
        }
        console.log("Successfully set audio src to:", actualSrc, "for answer", answerId);
      } catch (err) {
        console.error("Error setting audio src:", err);
        toast.error("Failed to set audio source");
        return;
      }

      // Set up event listeners
      audio.addEventListener("timeupdate", () => {
        setCurrentTime((prev) => ({ ...prev, [answerId]: audio.currentTime }));
      });

      audio.addEventListener("ended", () => {
        setPlayingAnswer(null);
        setCurrentTime((prev) => ({ ...prev, [answerId]: 0 }));
      });

      audio.addEventListener("error", (e) => {
        console.error("Audio error:", e, audio.error, "src:", audio.src);
        toast.error(`Failed to load audio file: ${audio.error?.message || 'Unknown error'}`);
        setPlayingAnswer(null);
      });

      // Store the audio element in state
      setAudioElements((prev) => ({ ...prev, [answerId]: audio }));
      
      // Set current time
      audio.currentTime = currentTime[answerId] || 0;

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup();
          toast.error("Audio loading timeout");
          reject(new Error("Timeout"));
        }, 10000); // 10 second timeout

        const onCanPlay = () => {
          clearTimeout(timeout);
          cleanup();
          audio
            .play()
            .then(() => {
              setPlayingAnswer(answerId);
              resolve();
            })
            .catch((playError) => {
              console.error("Play error:", playError);
              toast.error("Failed to play audio. Please check your browser's autoplay settings.");
              reject(playError);
            });
        };
        
        const onError = (e: Event) => {
          clearTimeout(timeout);
          cleanup();
          console.error("Audio load error:", e, audio.error, audio.src);
          toast.error(`Failed to load audio file: ${audio.error?.message || 'Unknown error'}`);
          setPlayingAnswer(null);
          reject(e);
        };
        
        const cleanup = () => {
          audio.removeEventListener("canplay", onCanPlay);
          audio.removeEventListener("error", onError);
        };
        
        audio.addEventListener("canplay", onCanPlay, { once: true });
        audio.addEventListener("error", onError, { once: true });
        audio.load();
      });
    } catch (error) {
      console.error("Toggle audio error:", error);
      toast.error("Failed to play audio");
      setPlayingAnswer(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
      {/* Left Sidebar - Reusable Component */}
      <CompanySidebar
        org={org}
        user={session.user}
        onSignOut={handleSignOut}
        onOpenSettings={() => setIsSettingsOpen(true)}
        active="jobs"
      />

      {/* Main Content */}
      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto pr-80">
        <div className="p-6 max-w-6xl mx-auto w-full">
          {/* Main Content Area */}
          <div className="space-y-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-3 mb-4">
              <nav className="flex items-center gap-2 text-sm">
                <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 transition-colors">
                  Dashboard
                </Link>
                <span className="text-gray-400">&gt;</span>
                <Link href="/dashboard/jobs" className="text-gray-500 hover:text-gray-700 transition-colors">
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
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-orange-100 rounded flex items-center justify-center">
                    <User className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-medium text-gray-900 mb-0.5">
                      {application.applicantEmail}
                    </h2>
                    <p className="text-xs text-gray-500">Applied to: {application.jobTitle}</p>
                    {application.applicantUniversityName && (
                      <p className="text-[10px] text-green-700 mt-0.5">
                        University: {application.applicantUniversityName}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-2.5 h-2.5 text-gray-500" />
                      <span className="text-[10px] text-gray-500">
                        {new Date(application.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <label className="text-[10px] text-gray-500 block mb-0.5">Status</label>
                  <Select value={application.stage} onValueChange={updateStage}>
                    <SelectTrigger className="min-w-[140px] w-auto text-xs h-7">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="applied">Applied</SelectItem>
                      <SelectItem value="reviewing">Reviewing</SelectItem>
                      <SelectItem value="phone_screen">Phone Screen</SelectItem>
                      <SelectItem value="assessment">Assessment</SelectItem>
                      <SelectItem value="onsite">Onsite</SelectItem>
                      <SelectItem value="offer">Offer</SelectItem>
                      <SelectItem value="hired">Hired</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="space-y-1.5">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                  <Button
                    variant="outline"
                    className="gap-1.5 text-xs h-8"
                    onClick={() => handleQuickAction("move_to_phone")}
                  >
                    <Phone className="w-2.5 h-2.5" />
                    Phone Screen
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-1.5 text-xs h-8"
                    onClick={handleSendEmail}
                  >
                    <Mail className="w-2.5 h-2.5" />
                    Send Email
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-1.5 text-xs h-8"
                    onClick={() => setAssignOpen(true)}
                    disabled={!orgIdForAssessments}
                    title={!orgIdForAssessments ? "Select or create an organization first" : "Assign assessment"}
                  >
                    <ListChecks className="w-2.5 h-2.5" />
                    Assign Assessment
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-1.5 text-xs h-8 text-red-600 hover:text-red-700"
                    onClick={() => handleQuickAction("reject")}
                  >
                    <X className="w-2.5 h-2.5" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>

            {/* Candidate Details (NEW) */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setIsCandidateDetailsExpanded(!isCandidateDetailsExpanded)}
                  className="flex items-center gap-1.5 text-base font-medium text-gray-900 hover:text-gray-700 transition-colors"
                >
                  <span>Candidate details</span>
                  {isCandidateDetailsExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {application.resumeS3Key ? (
                  <Button variant="outline" size="sm" className="text-xs h-7" onClick={handleDownloadResume}>
                    Download Resume {application.resumeFilename ? `(${application.resumeFilename})` : ""}
                  </Button>
                ) : null}
              </div>

              {/* Summary view when collapsed */}
              {!isCandidateDetailsExpanded && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 py-1.5">
                  <div>
                    <div className="text-[10px] text-gray-500">Name</div>
                    <div className="text-xs text-gray-900">{application.applicantName || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">Email</div>
                    <div className="text-xs text-gray-900">{application.applicantEmail}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">Phone</div>
                    <div className="text-xs text-gray-900">{application.phone || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">Location</div>
                    <div className="text-xs text-gray-900">
                      {[application.city, application.province, application.location].filter(Boolean).join(", ") || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">University</div>
                    <div className="text-xs text-gray-900">
                      {application.university || application.applicantUniversityName || "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">Experience</div>
                    <div className="text-xs text-gray-900">{application.experienceYears || "—"}</div>
                  </div>
                </div>
              )}

              {/* Full details when expanded */}
              {isCandidateDetailsExpanded && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Basics */}
                <div>
                  <div className="text-[10px] text-gray-500">Name</div>
                  <div className="text-xs text-gray-900">{application.applicantName || "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">Email</div>
                  <div className="text-xs text-gray-900">{application.applicantEmail}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">Phone</div>
                  <div className="text-xs text-gray-900">{application.phone || "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">WhatsApp</div>
                  <div className="text-xs text-gray-900">{application.whatsapp || "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">Location</div>
                  <div className="text-xs text-gray-900">
                    {[application.city, application.province, application.location].filter(Boolean).join(", ") || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">CNIC</div>
                  <div className="text-xs text-gray-900">{application.cnic || "—"}</div>
                </div>

                {/* Links */}
                <div>
                  <div className="text-[10px] text-gray-500">LinkedIn</div>
                  <div className="text-xs">
                    {application.linkedinUrl ? (
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={application.linkedinUrl}
                        className="text-blue-600 underline break-all"
                      >
                        {application.linkedinUrl}
                      </a>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">Portfolio</div>
                  <div className="text-xs">
                    {application.portfolioUrl ? (
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={application.portfolioUrl}
                        className="text-blue-600 underline break-all"
                      >
                        {application.portfolioUrl}
                      </a>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">GitHub</div>
                  <div className="text-xs">
                    {application.githubUrl ? (
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={application.githubUrl}
                        className="text-blue-600 underline break-all"
                      >
                        {application.githubUrl}
                      </a>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>

                {/* Work prefs */}
                <div>
                  <div className="text-[10px] text-gray-500">Work Authorization</div>
                  <div className="text-xs text-gray-900">{application.workAuth || "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">Needs Sponsorship</div>
                  <div className="text-xs text-gray-900">
                    {application.needSponsorship == null ? "—" : application.needSponsorship ? "Yes" : "No"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">Willing to Relocate</div>
                  <div className="text-xs text-gray-900">
                    {application.willingRelocate == null ? "—" : application.willingRelocate ? "Yes" : "No"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">Remote Preference</div>
                  <div className="text-xs text-gray-900">{application.remotePref || "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">Earliest Start</div>
                  <div className="text-xs text-gray-900">{application.earliestStart || "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">Salary Expectation (text)</div>
                  <div className="text-xs text-gray-900">{application.salaryExpectation || "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">Expected Salary (PKR)</div>
                  <div className="text-xs text-gray-900">{application.expectedSalaryPkr ?? "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">Notice Period (days)</div>
                  <div className="text-xs text-gray-900">{application.noticePeriodDays ?? "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">Experience</div>
                  <div className="text-xs text-gray-900">{application.experienceYears || "—"}</div>
                </div>

                {/* Education */}
                <div>
                  <div className="text-[10px] text-gray-500">University</div>
                  <div className="text-xs text-gray-900">
                    {application.university || application.applicantUniversityName || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">Degree</div>
                  <div className="text-xs text-gray-900">{application.degree || "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">Graduation Year</div>
                  <div className="text-xs text-gray-900">{application.graduationYear ?? "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-500">GPA</div>
                  <div className="text-xs text-gray-900">
                    {application.gpa ? `${application.gpa}${application.gpaScale ? ` / ${application.gpaScale}` : ""}` : "—"}
                  </div>
                </div>
              </div>
              )}
            </div>

            {/* Answers */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <h2 className="text-base font-medium text-gray-900 mb-3">Answers</h2>

              {answers.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-gray-500">No answers recorded</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {answers.map((answer) => {
                    const question = questions.find((q) => q.id === answer.questionId);
                    const reactionsForAnswer = reactions[answer.id] || [];
                    const currentUserReaction = reactionsForAnswer.find(
                      (reaction) =>
                        reaction.userEmail === session?.user?.email || reaction.userId === session?.user?.id,
                    );
                    const activeReaction =
                      reactionDialog.open && reactionDialog.answerId === answer.id
                        ? reactionDialog.reaction
                        : currentUserReaction?.reaction ?? null;

                    return (
                      <div key={answer.id} className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                        {/* Play Button */}
                        <button
                          onClick={() => {
                            const hasAudio = answer.audioS3Key && 
                                            typeof answer.audioS3Key === 'string' && 
                                            answer.audioS3Key.trim() !== '';
                            if (hasAudio) {
                              toggleAudio(answer.id, answer.audioS3Key);
                            } else {
                              console.warn("No audio file available for answer", answer.id, "audioS3Key:", answer.audioS3Key);
                              toast.error("No audio file available for this answer");
                            }
                          }}
                          disabled={!answer.audioS3Key || 
                                   typeof answer.audioS3Key !== 'string' || 
                                   answer.audioS3Key.trim() === ''}
                          className="w-8 h-8 bg-white rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {playingAnswer === answer.id ? (
                            <Pause className="w-3.5 h-3.5 text-gray-700" />
                          ) : (
                            <Play className="w-3.5 h-3.5 text-gray-700 ml-0.5" />
                          )}
                        </button>

                        {/* Question Content */}
                        <div className="flex-1">
                          <h3 className="text-xs font-semibold text-gray-900 mb-0.5">
                            {question?.prompt || "Question not found"}
                          </h3>
                          <p className="text-[10px] text-gray-600">Feel free to get technical here!</p>
                        </div>

                        {/* Duration and Actions */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500">
                            {formatTime(currentTime[answer.id] || 0)} /{" "}
                            {formatTime(answer.durationSec || audioElements[answer.id]?.duration || 0)}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openReactionDialog(answer.id, "like")}
                              className={`p-0.5 hover:bg-gray-200 rounded transition-colors ${
                                activeReaction === "like" ? "bg-green-100" : ""
                              }`}
                            >
                              <ThumbsUp
                                className={`w-3 h-3 ${
                                  activeReaction === "like" ? "text-green-600" : "text-gray-500"
                                }`}
                              />
                            </button>
                            <button
                              onClick={() => openReactionDialog(answer.id, "dislike")}
                              className={`p-0.5 hover:bg-gray-200 rounded transition-colors ${
                                activeReaction === "dislike" ? "bg-red-100" : ""
                              }`}
                            >
                              <ThumbsDown
                                className={`w-3 h-3 ${
                                  activeReaction === "dislike" ? "text-red-600" : "text-gray-500"
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Assigned Assessments */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <h2 className="text-base font-medium text-gray-900 mb-3">Assigned Assessments</h2>
              {assignments.length === 0 ? (
                <div className="text-xs text-gray-600">No assessments assigned yet.</div>
              ) : (
                <ul className="space-y-2">
                  {assignments.map((a) => (
                    <li key={a.id} className="border rounded p-3 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-gray-900">{a.assessmentTitle}</div>
                        <div className="text-[10px] text-gray-500">
                          {a.assessmentType} • {a.assessmentDuration} • status: {a.status}
                          {a.dueAt ? ` • due ${new Date(a.dueAt).toLocaleString()}` : ""}
              </div>
                      </div>
                      <button
                        onClick={() => handleDeleteAssignment(a.id)}
                        className="ml-3 p-1.5 hover:bg-red-100 rounded transition-colors flex-shrink-0"
                        title="Revoke assignment"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* AI Analysis Placeholder */}
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg shadow-sm p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Sparkles className="w-3 h-3 text-orange-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <h2 className="text-sm font-medium text-gray-900">AI Analysis</h2>
                    <p className="text-[10px] text-gray-600 truncate">
                Generate an AI-powered summary of this candidate&apos;s responses
              </p>
                  </div>
                </div>
                <Button className="gap-1.5 text-xs h-7 flex-shrink-0">
                  <Sparkles className="w-2.5 h-2.5" />
                Generate Summary
              </Button>
            </div>
          </div>
          </div>
        </div>
      </main>

      {/* Right Sidebar - Activity (Fixed) */}
      <aside className="fixed right-0 top-0 w-80 h-screen bg-[#FEFEFA] border-l border-gray-200 flex flex-col z-10">
            <div className="p-3 flex flex-col h-full overflow-hidden">
              <h2 className="text-base font-semibold mb-2 text-gray-900">Activity</h2>

              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="space-y-2">
                  {answers.map((answer) => {
                    const answerComments = comments[answer.id] || [];
                    const question = questions.find((q) => q.id === answer.questionId);
                    const questionText = question?.prompt || "this answer";

                    return (
                      <div key={answer.id} className="space-y-2">
                        {/* Reactions Section */}
                        {reactions[answer.id] && reactions[answer.id].length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <div className="h-px flex-1 bg-gray-200"></div>
                              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Feedback</span>
                              <div className="h-px flex-1 bg-gray-200"></div>
                            </div>
                            {reactions[answer.id].map((reaction) => {
                              const actorName = reaction.userName || reaction.userEmail || "Team member";
                              return (
                                <div key={reaction.id} className="flex items-start gap-2 p-2 bg-gradient-to-r from-green-50/50 to-blue-50/50 border border-green-100 rounded">
                                  <div className="mt-0.5">
                                  {reaction.reaction === "like" ? (
                                      <ThumbsUp className="w-3 h-3 text-green-600" />
                                  ) : (
                                      <ThumbsDown className="w-3 h-3 text-red-600" />
                                  )}
                                </div>
                                  <div className="flex-1 min-w-0 space-y-0.5">
                                    <p className="text-xs font-medium text-gray-900 leading-tight">
                                      {actorName} {reaction.reaction === "like" ? "liked" : "disliked"} "{questionText}"
                                    </p>
                                    {reaction.explanation && (
                                      <p className="text-xs italic text-gray-700 break-words bg-white/60 rounded px-1.5 py-0.5 mt-0.5 leading-relaxed">
                                        "{reaction.explanation}"
                                      </p>
                                    )}
                                    <span className="text-[10px] text-gray-500">
                                      {formatDateTime(reaction.updatedAt || reaction.createdAt)}
                                </span>
                              </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Comments Section */}
                        {answerComments.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <div className="h-px flex-1 bg-gray-200"></div>
                              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Comments</span>
                              <div className="h-px flex-1 bg-gray-200"></div>
                            </div>
                            {answerComments.map((comment) => (
                              <div key={comment.id} className="flex items-start gap-2 p-2 bg-white border border-gray-200 rounded shadow-sm">
                                <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
                                  <span className="text-[10px] font-medium text-white">
                                    {comment.userName?.charAt(0)?.toUpperCase() || "U"}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between mb-0.5">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-gray-900 truncate leading-tight">
                                        {comment.userName || "User"}
                                      </p>
                                      <p className="text-[10px] text-gray-500">Employer</p>
                                    </div>
                                    <div className="flex items-center gap-1 ml-1.5 flex-shrink-0">
                                      <p className="text-[10px] text-gray-400">
                                        {new Date(comment.createdAt).toLocaleDateString()}
                                      </p>
                                      {comment.userEmail === session?.user?.email && (
                                        <button
                                          onClick={() => handleDeleteComment(comment.id, answer.id)}
                                          className="p-0.5 hover:bg-red-100 rounded transition-colors"
                                          title="Delete comment"
                                        >
                                          <Trash2 className="w-2.5 h-2.5 text-red-500" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-xs text-gray-700 break-words mt-0.5 leading-relaxed">{comment.comment}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                                )}
                              </div>
                    );
                  })}
                                </div>
                              </div>

              {/* Add Comment - Fixed at bottom */}
              <div className="border-t border-gray-200 p-2.5 bg-white">
                <div className="flex gap-1.5">
                          <input
                            type="text"
                    placeholder="Add a comment..."
                    value={newComment[answers[0]?.id] || ""}
                    onChange={(e) => {
                      if (answers[0]?.id) {
                        setNewComment((prev) => ({ ...prev, [answers[0].id]: e.target.value }));
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && answers[0]?.id) {
                        handleAddComment(answers[0].id);
                      }
                    }}
                    className="flex-1 text-xs px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
                          />
                          <Button
                            size="sm"
                    onClick={() => answers[0]?.id && handleAddComment(answers[0].id)}
                    disabled={!answers[0]?.id || !newComment[answers[0]?.id]?.trim()}
                    className="px-2 py-1.5 h-auto flex-shrink-0 bg-gray-600 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                    <Plus className="w-3 h-3" />
                          </Button>
                </div>
              </div>
            </div>
          </aside>

      <CommandPalette isOpen={isCommandPaletteOpen} onClose={closeCommandPalette} orgId={org?.id} />

      {/* Reaction Explanation Dialog */}
      <Dialog
        open={reactionDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelReaction();
          }
        }}
      >
        <DialogContent
          onInteractOutside={(event) => event.preventDefault()}
          onEscapeKeyDown={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {reactionDialog.reaction === "like" ? "Why did you like this answer?" : "Why did you dislike this answer?"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Please provide a short explanation so your teammates understand your feedback.
            </p>
            <Textarea
              value={reactionDialog.explanation}
              onChange={(e) =>
                setReactionDialog((prev) => ({
                  ...prev,
                  explanation: e.target.value,
                }))
              }
              placeholder="Share your reasoning..."
              rows={4}
              autoFocus
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={handleCancelReaction} disabled={reactionDialog.isSaving}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveReaction}
              disabled={reactionDialog.isSaving || !reactionDialog.explanation.trim()}
            >
              {reactionDialog.isSaving ? "Saving..." : "Save feedback"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Assessment Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign assessment</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Assessment</Label>
              <Select value={selectedAssessmentId} onValueChange={(v) => setSelectedAssessmentId(v)}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={assessments.length ? "Select an assessment" : "No assessments available"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {assessments.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.title} ({a.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueAt">Due (optional)</Label>
              <Input id="dueAt" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button variant="ghost" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignAssessment} disabled={assignSubmitting || !selectedAssessmentId || !applicationId}>
              {assignSubmitting ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        organization={org ? { id: org.id, name: org.name, slug: '', type: 'company', plan: 'free', seatLimit: 5, createdAt: '', updatedAt: '' } : null}
      />
    </div>
  );
}
