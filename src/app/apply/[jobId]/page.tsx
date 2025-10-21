"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Mic,
  Square,
  Play,
  Pause,
  Upload,
  CheckCircle2,
  Loader2,
} from "lucide-react";

interface Job {
  id: number;
  title: string;
  dept: string | null;
  locationMode: string | null;
  salaryRange: string | null;
  descriptionMd: string | null;
}

interface Question {
  id: number;
  prompt: string;
  maxSec: number;
  required: boolean;
  orderIndex: number;
}

interface VoiceAnswer {
  questionId: number;
  blob: Blob | null;
  duration: number;
  audioUrl: string | null;
}

export default function ApplyPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form data
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [voiceAnswers, setVoiceAnswers] = useState<VoiceAnswer[]>([]);

  // Recording state
  const [currentQuestion, setCurrentQuestion] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchJobData();
  }, [params.jobId]);

  const fetchJobData = async () => {
    try {
      const jobResponse = await fetch(`/api/jobs?id=${params.jobId}`);
      if (jobResponse.ok) {
        const jobData = await jobResponse.json();
        setJob(jobData);
      }

      const questionsResponse = await fetch(
        `/api/jobs/${params.jobId}/questions`
      );
      if (questionsResponse.ok) {
        const questionsData = await questionsResponse.json();
        setQuestions(questionsData);
        setVoiceAnswers(
          questionsData.map((q: Question) => ({
            questionId: q.id,
            blob: null,
            duration: 0,
            audioUrl: null,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch job data:", error);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async (questionIndex: number) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const audioUrl = URL.createObjectURL(audioBlob);

        setVoiceAnswers((prev) => {
          const updated = [...prev];
          updated[questionIndex] = {
            ...updated[questionIndex],
            blob: audioBlob,
            audioUrl,
            duration: recordingTime,
          };
          return updated;
        });

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setCurrentQuestion(questionIndex);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= questions[questionIndex].maxSec) {
            stopRecording();
          }
          return newTime;
        });
      }, 1000);
    } catch (error) {
      toast.error("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setCurrentQuestion(null);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const playAudio = (questionIndex: number) => {
    const answer = voiceAnswers[questionIndex];
    if (!answer.audioUrl) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(answer.audioUrl);
    audioRef.current = audio;

    audio.onended = () => {
      setIsPlaying(null);
    };

    audio.play();
    setIsPlaying(questionIndex);
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all required questions have answers
    const missingAnswers = questions.filter((q, idx) => 
      q.required && !voiceAnswers[idx]?.blob
    );

    if (missingAnswers.length > 0) {
      toast.error("Please answer all required questions");
      return;
    }

    setSubmitting(true);

    try {
      // Create application
      const appResponse = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: params.jobId,
          applicantEmail,
        }),
      });

      if (!appResponse.ok) {
        throw new Error("Failed to create application");
      }

      const application = await appResponse.json();

      // Upload voice answers
      for (let i = 0; i < voiceAnswers.length; i++) {
        const answer = voiceAnswers[i];
        if (answer.blob) {
          const formData = new FormData();
          formData.append("audio", answer.blob, `answer-${i}.webm`);
          formData.append("applicationId", application.id.toString());
          formData.append("questionId", answer.questionId.toString());
          formData.append("durationSec", answer.duration.toString());

          await fetch("/api/answers", {
            method: "POST",
            body: formData,
          });
        }
      }

      toast.success("Application submitted successfully!");
      router.push(`/apply/${params.jobId}/success`);
    } catch (error) {
      toast.error("Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Job not found
          </h1>
          <p className="text-muted-foreground">
            This job posting may have been removed or doesn't exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <header className="bg-white border-b border-border py-6">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-display font-bold text-foreground">
            {job.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            {job.dept} • {job.locationMode} • {job.salaryRange}
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Applicant Info */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-display font-bold text-foreground mb-6">
                Your Information
              </h2>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={applicantEmail}
                    onChange={(e) => setApplicantEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="resume">Resume (Optional)</Label>
                  <Input
                    id="resume"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setResume(e.target.files?.[0] || null)}
                  />
                </div>
              </div>
            </div>

            {/* Voice Questions */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                Voice Questions
              </h2>
              <p className="text-muted-foreground mb-6">
                Record your answers to the following questions
              </p>

              <div className="space-y-6">
                {questions.map((question, index) => {
                  const answer = voiceAnswers[index];
                  const hasRecording = answer?.blob !== null;

                  return (
                    <div
                      key={question.id}
                      className="p-6 border-2 border-border rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-foreground mb-1">
                            Question {index + 1}
                            {question.required && (
                              <span className="text-destructive ml-1">*</span>
                            )}
                          </h3>
                          <p className="text-muted-foreground">
                            {question.prompt}
                          </p>
                        </div>
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          Max {question.maxSec}s
                        </span>
                      </div>

                      {!hasRecording ? (
                        <div className="space-y-3">
                          {isRecording && currentQuestion === index ? (
                            <div className="text-center py-4">
                              <div className="w-16 h-16 bg-destructive rounded-full mx-auto mb-3 flex items-center justify-center animate-pulse">
                                <Mic className="w-8 h-8 text-white" />
                              </div>
                              <div className="text-2xl font-bold text-foreground mb-1">
                                {Math.floor(recordingTime / 60)}:
                                {(recordingTime % 60).toString().padStart(2, "0")}
                              </div>
                              <p className="text-sm text-muted-foreground mb-4">
                                Recording...
                              </p>
                              <Button
                                type="button"
                                variant="destructive"
                                onClick={stopRecording}
                                className="gap-2"
                              >
                                <Square className="w-4 h-4" />
                                Stop Recording
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              onClick={() => startRecording(index)}
                              className="w-full gap-2"
                              disabled={isRecording}
                            >
                              <Mic className="w-4 h-4" />
                              Start Recording
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                              <span className="text-sm font-medium text-green-900">
                                Recorded ({answer.duration}s)
                              </span>
                            </div>
                            {isPlaying === index ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={pauseAudio}
                              >
                                <Pause className="w-4 h-4" />
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => playAudio(index)}
                              >
                                <Play className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => startRecording(index)}
                            className="w-full"
                            disabled={isRecording}
                          >
                            Re-record Answer
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <Button
                type="submit"
                disabled={submitting}
                className="w-full gap-2"
                size="lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Submit Application
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
