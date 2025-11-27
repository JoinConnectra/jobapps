// src/app/student/jobs/[id]/apply/page.tsx
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
  ExternalLink,
} from "lucide-react";

interface Job {
  id: number;
  title: string;
  dept: string | null;
  locationMode: string | null;
  salaryRange: string | null;
  descriptionMd: string | null;
  orgName?: string | null;
  orgWebsite?: string | null;
}

interface Question {
  id: number;
  prompt: string;
  kind?: "voice" | "text" | "yesno";
  maxSec: number;
  maxChars?: number | null;
  required: boolean;
  orderIndex: number;
}

interface VoiceAnswer {
  questionId: number;
  blob: Blob | null;
  duration: number;
  audioUrl: string | null;
}

interface TextAnswerState {
  questionId: number;
  text: string;
}

// helper to coerce date-like strings to YYYY-MM-DD for <input type="date">
function toDateInputValue(v: any): string {
  if (!v) return "";
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : "";
}

export default function StudentApplyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Contact
  const [applicantName, setApplicantName] = useState("");
  const [applicantEmail, setApplicantEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [cnic, setCnic] = useState("");

  // Links
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");

  // Work prefs
  const [workAuth, setWorkAuth] = useState("");
  const [needSponsorship, setNeedSponsorship] = useState<null | boolean>(null);
  const [willingRelocate, setWillingRelocate] = useState<null | boolean>(null);
  const [remotePref, setRemotePref] = useState("");
  const [earliestStart, setEarliestStart] = useState("");
  const [salaryExpectation, setSalaryExpectation] = useState("");

  // Pakistan extras
  const [expectedSalaryPkr, setExpectedSalaryPkr] = useState<string>("");
  const [noticePeriodDays, setNoticePeriodDays] = useState<string>("");
  const [experienceYears, setExperienceYears] = useState<string>("");

  // Education
  const [university, setUniversity] = useState("");
  const [degree, setDegree] = useState("");
  const [graduationYear, setGraduationYear] = useState<string>("");
  const [gpa, setGpa] = useState<string>("");
  const [gpaScale, setGpaScale] = useState<string>("4.0");

  // Cover letter
  const [coverLetter, setCoverLetter] = useState("");

  // Files
  const [resume, setResume] = useState<File | null>(null);

  // Answers
  const [voiceAnswers, setVoiceAnswers] = useState<VoiceAnswer[]>([]);
  const [textAnswers, setTextAnswers] = useState<TextAnswerState[]>([]);

  // Recording state
  const [currentQuestion, setCurrentQuestion] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // one-time guard so profile prefill runs once
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    fetchJobData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  // fetch student profile to prefill the form once
  useEffect(() => {
    (async () => {
      if (prefilled) return;
      try {
        const res = await fetch("/api/student/profile", { cache: "no-store" });
        if (!res.ok) return;
        const p = await res.json();

        // basic user
        setApplicantName((v) => v || p?.name || "");
        setApplicantEmail((v) => v || p?.email || "");
        setPhone((v) => v || p?.phone || "");

        // standard profile → defaults
        setWhatsapp((v) => v || p?.whatsapp || "");
        setLocation((v) => v || p?.location || "");
        setCity((v) => v || p?.locationCity || "");
        setProvince((v) => v || p?.province || "");
        setCnic((v) => v || p?.cnic || "");

        setLinkedinUrl((v) => v || p?.linkedinUrl || "");
        setPortfolioUrl((v) => v || p?.portfolioUrl || p?.websiteUrl || "");
        setGithubUrl((v) => v || p?.githubUrl || "");

        setWorkAuth((v) => v || p?.workAuth || "");
        setNeedSponsorship((v) =>
          v === null
            ? p?.needSponsorship === null || p?.needSponsorship === undefined
              ? null
              : !!p.needSponsorship
            : v
        );
        setWillingRelocate((v) =>
          v === null
            ? p?.willingRelocate === null || p?.willingRelocate === undefined
              ? null
              : !!p.willingRelocate
            : v
        );
        setRemotePref((v) => v || p?.remotePref || "");
        setEarliestStart((v) => v || toDateInputValue(p?.earliestStart));
        setSalaryExpectation((v) => v || p?.salaryExpectation || "");
        setExpectedSalaryPkr((v) =>
          v || (p?.expectedSalaryPkr != null ? String(p.expectedSalaryPkr) : "")
        );
        setNoticePeriodDays((v) =>
          v || (p?.noticePeriodDays != null ? String(p.noticePeriodDays) : "")
        );
        setExperienceYears((v) =>
          v || (p?.experienceYears != null ? String(p.experienceYears) : "")
        );

        setPrefilled(true);
      } catch (e) {
        // non-fatal
        console.warn("Profile prefill failed", e);
      }
    })();
  }, [prefilled]);

  const fetchJobData = async () => {
    try {
      // Student-visible job detail endpoint
      const jobResponse = await fetch(`/api/jobs/${params.id}`);
      if (jobResponse.ok) {
        const jobData = await jobResponse.json();
        setJob({
          id: jobData.id,
          title: jobData.title,
          dept: jobData.dept ?? null,
          locationMode: jobData.locationMode ?? null,
          salaryRange: jobData.salaryRange ?? null,
          descriptionMd: jobData.descriptionMd ?? null,
          orgName: jobData.orgName ?? null,
          orgWebsite: jobData.orgWebsite ?? jobData.organization?.website ?? null,
        });
      }

      const questionsResponse = await fetch(`/api/jobs/${params.id}/questions`);
      if (questionsResponse.ok) {
        const questionsData: Question[] = await questionsResponse.json();
        setQuestions(questionsData);
        setVoiceAnswers(
          questionsData.map((q) => ({
            questionId: q.id,
            blob: null,
            duration: 0,
            audioUrl: null,
          }))
        );
        setTextAnswers(
          questionsData.map((q) => ({
            questionId: q.id,
            text: "",
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
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
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
          if (newTime >= questions[questionIndex].maxSec) stopRecording();
          return newTime;
        });
      }, 1000);
    } catch {
      toast.error("Could not access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setCurrentQuestion(null);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const playAudio = (questionIndex: number) => {
    const answer = voiceAnswers[questionIndex];
    if (!answer?.audioUrl) return;

    if (audioRef.current) audioRef.current.pause();
    const audio = new Audio(answer.audioUrl);
    audioRef.current = audio;

    audio.onended = () => setIsPlaying(null);
    audio.play();
    setIsPlaying(questionIndex);
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(null);
    }
  };

  const validateUrls = () => {
    const isUrl = (s: string) => !s || /^https?:\/\/.+/i.test(s.trim());
    if (!isUrl(linkedinUrl)) return "LinkedIn URL must start with http(s)://";
    if (!isUrl(portfolioUrl)) return "Portfolio URL must start with http(s)://";
    if (!isUrl(githubUrl)) return "GitHub URL must start with http(s)://";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!applicantName.trim() || !applicantEmail.trim()) {
      toast.error("Please fill in your name and email");
      return;
    }
    const urlErr = validateUrls();
    if (urlErr) {
      toast.error(urlErr);
      return;
    }

    // Required question validation for text + yes/no
    const missingAnswers = questions.filter((q, idx) => {
      if (!q.required) return false;
      if (q.kind === "text" || q.kind === "yesno") {
        return !textAnswers[idx]?.text?.trim();
      }
      // voice questions do not block submission
      return false;
    });

    if (missingAnswers.length > 0) {
      toast.error("Please answer all required questions");
      return;
    }

    setSubmitting(true);

    try {
      // 1) Create application (including all metadata)
      const appResponse = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: Number(params.id),

          applicantName: applicantName.trim(),
          applicantEmail: applicantEmail.trim(),
          phone: phone.trim() || null,
          whatsapp: whatsapp.trim() || null,
          location: location.trim() || null,
          city: city.trim() || null,
          province: province.trim() || null,
          cnic: cnic.trim() || null,

          linkedinUrl: linkedinUrl.trim() || null,
          portfolioUrl: portfolioUrl.trim() || null,
          githubUrl: githubUrl.trim() || null,

          workAuth: workAuth || null,
          needSponsorship: needSponsorship === null ? null : Boolean(needSponsorship),
          willingRelocate: willingRelocate === null ? null : Boolean(willingRelocate),
          remotePref: remotePref || null,
          earliestStart: earliestStart || null,
          salaryExpectation: salaryExpectation.trim() || null,

          expectedSalaryPkr: expectedSalaryPkr ? Number(expectedSalaryPkr) : null,
          noticePeriodDays: noticePeriodDays ? Number(noticePeriodDays) : null,
          experienceYears: experienceYears || null,

          university: university.trim() || null,
          degree: degree.trim() || null,
          graduationYear: graduationYear ? Number(graduationYear) : null,
          gpa: gpa || null,
          gpaScale: gpaScale || null,

          coverLetter: coverLetter.trim() || null,
          source: "student-portal",
        }),
      });
      if (!appResponse.ok) throw new Error(await appResponse.text());
      const application = await appResponse.json();

      // 2) Upload resume to the application row (if provided)
      if (resume) {
        const rf = new FormData();
        rf.append("resume", resume);
        await fetch(`/api/applications/${application.id}/resume`, {
          method: "POST",
          body: rf,
        });
      }

      // 3) Persist answers
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];

        if (q.kind === "text" || q.kind === "yesno") {
          const ta = textAnswers[i];
          if (ta?.text?.trim()) {
            await fetch("/api/answers", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                applicationId: application.id,
                questionId: q.id,
                textAnswer: ta.text.trim(), // "yes"/"no" or free text
              }),
            });
          }
        } else {
          // voice (or default)
          const va = voiceAnswers[i];
          if (va?.blob) {
            const formData = new FormData();
            formData.append("audio", va.blob, `answer-${i}.webm`);
            formData.append("applicationId", application.id.toString());
            formData.append("questionId", q.id.toString());
            formData.append("durationSec", va.duration.toString());
            await fetch("/api/answers", { method: "POST", body: formData });
          }
        }
      }

      toast.success("Application submitted successfully!");
      router.push(`/student/jobs/${params.id}/apply/success`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Job not found</h1>
          <p className="text-muted-foreground">
            This job posting may have been removed or doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      <header className="bg-white border-b border-border py-6">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-display font-bold text-foreground">{job.title}</h1>
          <p className="text-muted-foreground mt-1">
            {(job.orgName ? job.orgName + " • " : "")}
            {job.dept ?? "—"} • {job.locationMode ?? "—"} • {job.salaryRange ?? "—"}
          </p>
          {job.orgWebsite && (
            <div className="mt-2">
              <a
                href={job.orgWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Visit company website
              </a>
            </div>
          )}
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

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={applicantName}
                    onChange={(e) => setApplicantName(e.target.value)}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Label htmlFor="phone">Phone (optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+92 3XX XXX XXXX"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="whatsapp">WhatsApp (optional)</Label>
                    <Input
                      id="whatsapp"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="+92 3XX XXX XXXX"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cnic">CNIC (optional)</Label>
                    <Input
                      id="cnic"
                      value={cnic}
                      onChange={(e) => setCnic(e.target.value)}
                      placeholder="35101XXXXXXXXX"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="location">Location (freeform)</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., DHA, Lahore"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Lahore / Karachi / Islamabad …"
                    />
                  </div>
                  <div>
                    <Label htmlFor="province">Province / Territory</Label>
                    <Input
                      id="province"
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      placeholder="Punjab, Sindh, KPK, Balochistan, ICT, GB, AJK"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="linkedin">LinkedIn</Label>
                    <Input
                      id="linkedin"
                      value={linkedinUrl}
                      onChange={(e) => setLinkedinUrl(e.target.value)}
                      placeholder="https://www.linkedin.com/in/username"
                    />
                  </div>
                  <div>
                    <Label htmlFor="portfolio">Portfolio / Website</Label>
                    <Input
                      id="portfolio"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      placeholder="https://your.site"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="github">GitHub (optional)</Label>
                  <Input
                    id="github"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/username"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="workAuth">Work Authorization</Label>
                    <select
                      id="workAuth"
                      className="w-full border border-border rounded-lg h-10 px-3 bg-white"
                      value={workAuth}
                      onChange={(e) => setWorkAuth(e.target.value)}
                    >
                      <option value="">Select…</option>
                      <option value="Citizen/PR">Citizen / Permanent Resident</option>
                      <option value="Authorized (no sponsorship)">
                        Authorized (no sponsorship)
                      </option>
                      <option value="Needs sponsorship">Needs sponsorship</option>
                      <option value="Other / Not specified">
                        Other / Not specified
                      </option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="needSponsorship">
                      Require Future Sponsorship?
                    </Label>
                    <select
                      id="needSponsorship"
                      className="w-full border border-border rounded-lg h-10 px-3 bg-white"
                      value={
                        needSponsorship === null
                          ? ""
                          : needSponsorship
                          ? "yes"
                          : "no"
                      }
                      onChange={(e) =>
                        setNeedSponsorship(
                          e.target.value === ""
                            ? null
                            : e.target.value === "yes"
                        )
                      }
                    >
                      <option value="">Select…</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="relocate">Willing to Relocate?</Label>
                    <select
                      id="relocate"
                      className="w-full border border-border rounded-lg h-10 px-3 bg-white"
                      value={
                        willingRelocate === null
                          ? ""
                          : willingRelocate
                          ? "yes"
                          : "no"
                      }
                      onChange={(e) =>
                        setWillingRelocate(
                          e.target.value === ""
                            ? null
                            : e.target.value === "yes"
                        )
                      }
                    >
                      <option value="">Select…</option>
                      <option value="yes">Yes</option>
                      <option value="no">No</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="remotePref">Work Preference</Label>
                    <select
                      id="remotePref"
                      className="w-full border border-border rounded-lg h-10 px-3 bg-white"
                      value={remotePref}
                      onChange={(e) => setRemotePref(e.target.value)}
                    >
                      <option value="">Select…</option>
                      <option value="Onsite">Onsite</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Remote">Remote</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start">Earliest Start Date</Label>
                    <Input
                      id="start"
                      type="date"
                      value={earliestStart}
                      onChange={(e) => setEarliestStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="salary">
                      Salary Expectation (optional)
                    </Label>
                    <Input
                      id="salary"
                      value={salaryExpectation}
                      onChange={(e) => setSalaryExpectation(e.target.value)}
                      placeholder="PKR range or text"
                    />
                  </div>
                </div>

                {/* Pakistan-focused extras */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="expYears">Experience (years)</Label>
                    <Input
                      id="expYears"
                      value={experienceYears}
                      onChange={(e) => setExperienceYears(e.target.value)}
                      placeholder="e.g., 2.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="expectedPkr">Expected Salary (PKR)</Label>
                    <Input
                      id="expectedPkr"
                      type="number"
                      value={expectedSalaryPkr}
                      onChange={(e) => setExpectedSalaryPkr(e.target.value)}
                      placeholder="e.g., 150000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="notice">Notice Period (days)</Label>
                    <Input
                      id="notice"
                      type="number"
                      value={noticePeriodDays}
                      onChange={(e) => setNoticePeriodDays(e.target.value)}
                      placeholder="e.g., 30"
                    />
                  </div>
                </div>

                {/* Education */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="university">University</Label>
                    <Input
                      id="university"
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      placeholder="e.g., LUMS, NUST, FAST, IBA…"
                    />
                  </div>
                  <div>
                    <Label htmlFor="degree">Degree</Label>
                    <Input
                      id="degree"
                      value={degree}
                      onChange={(e) => setDegree(e.target.value)}
                      placeholder="e.g., BS CS, BBA, MS Data Science"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="gradYear">Graduation Year</Label>
                    <Input
                      id="gradYear"
                      type="number"
                      value={graduationYear}
                      onChange={(e) => setGraduationYear(e.target.value)}
                      placeholder="e.g., 2024"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gpa">GPA / CGPA</Label>
                    <Input
                      id="gpa"
                      value={gpa}
                      onChange={(e) => setGpa(e.target.value)}
                      placeholder="e.g., 3.45"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gpaScale">GPA Scale</Label>
                    <Input
                      id="gpaScale"
                      value={gpaScale}
                      onChange={(e) => setGpaScale(e.target.value)}
                      placeholder="4.0 / 5.0 / 100%"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="resume">Resume (optional)</Label>
                  <Input
                    id="resume"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) =>
                      setResume(e.target.files?.[0] || null)
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="cover">Cover Letter (optional)</Label>
                  <textarea
                    id="cover"
                    className="w-full border border-border rounded-lg p-3"
                    rows={6}
                    placeholder="Share anything you want us to know…"
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Questions */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                Questions
              </h2>
              <p className="text-muted-foreground mb-6">
                Answer the questions below. Some may require a voice recording;
                others a written or yes/no answer.
              </p>

              <div className="space-y-6">
                {questions.map((question, index) => {
                  const answer = voiceAnswers[index];
                  const hasRecording = answer?.blob !== null;

                  const isText = question.kind === "text";
                  const isYesNo = question.kind === "yesno";
                  const isVoice =
                    !question.kind || question.kind === "voice";

                  const currentText = textAnswers[index]?.text || "";

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
                              <span className="text-destructive ml-1">
                                *
                              </span>
                            )}
                          </h3>
                          <p className="text-muted-foreground">
                            {question.prompt}
                          </p>
                        </div>
                        {isText ? (
                          <span className="text-xs bg-muted px-2 py-1 rounded">
                            Text
                          </span>
                        ) : isYesNo ? (
                          <span className="text-xs bg-muted px-2 py-1 rounded">
                            Yes / No
                          </span>
                        ) : (
                          <span className="text-xs bg-muted px-2 py-1 rounded">
                            Max {question.maxSec}s
                          </span>
                        )}
                      </div>

                      {isText ? (
                        <div>
                          <textarea
                            value={currentText}
                            onChange={(e) => {
                              const updated = [...textAnswers];
                              updated[index] = {
                                questionId: question.id,
                                text: e.target.value,
                              };
                              setTextAnswers(updated);
                            }}
                            className="w-full border border-border rounded-lg p-3"
                            rows={4}
                            placeholder="Type your answer here..."
                            maxLength={question.maxChars || undefined}
                          />
                          {question.maxChars ? (
                            <div className="text-xs text-muted-foreground mt-1">
                              {currentText.length}/{question.maxChars}{" "}
                              characters
                            </div>
                          ) : null}
                        </div>
                      ) : isYesNo ? (
                        <div className="flex items-center gap-3">
                          <Button
                            type="button"
                            variant={
                              currentText === "yes" ? "default" : "outline"
                            }
                            onClick={() => {
                              const updated = [...textAnswers];
                              updated[index] = {
                                questionId: question.id,
                                text: "yes",
                              };
                              setTextAnswers(updated);
                            }}
                          >
                            Yes
                          </Button>
                          <Button
                            type="button"
                            variant={
                              currentText === "no" ? "default" : "outline"
                            }
                            onClick={() => {
                              const updated = [...textAnswers];
                              updated[index] = {
                                questionId: question.id,
                                text: "no",
                              };
                              setTextAnswers(updated);
                            }}
                          >
                            No
                          </Button>
                        </div>
                      ) : !hasRecording ? (
                        <div className="space-y-3">
                          {isRecording && currentQuestion === index ? (
                            <div className="text-center py-4">
                              <div className="w-16 h-16 bg-destructive rounded-full mx-auto mb-3 flex items-center justify-center animate-pulse">
                                <Mic className="w-8 h-8 text-white" />
                              </div>
                              <div className="text-2xl font-bold text-foreground mb-1">
                                {Math.floor(recordingTime / 60)}:
                                {(recordingTime % 60)
                                  .toString()
                                  .padStart(2, "0")}
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
