// /src/app/dashboard/interviews/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, authClient } from "@/lib/auth-client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";

import CompanySidebar from "@/components/company/CompanySidebar";
import CommandPalette from "@/components/CommandPalette";
import SettingsModal from "@/components/SettingsModal";
import { useCommandPalette } from "@/hooks/use-command-palette";

import {
  Calendar,
  Clock,
  MapPin,
  RefreshCw,
  User2,
  Briefcase,
} from "lucide-react";

type InterviewSlot = {
  id: number;
  orgId: number;
  jobId: number | null;
  createdByUserId: number;
  startAt: string;
  endAt: string;
  locationType: string;
  locationDetail: string | null;
  maxCandidates: number;
  status: string;
  notes: string | null;
  // enriched by API
  applicationId?: number | null;
  candidateName?: string | null;
  candidateEmail?: string | null;
  candidateStage?: string | null;
  jobTitle?: string | null;
};

type JobOption = {
  id: number;
  title: string;
};

type CandidateOption = {
  applicationId: number;
  name: string | null;
  email: string;
  stage: string | null;
};

// date -> array of "HH:MM"
type TimeSelections = Record<string, string[]>;

type SlotFilter = "upcoming" | "all";

const todayISO = () => new Date().toISOString().slice(0, 10);

// Calendly-style time slots
const TIME_SLOTS: string[] = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
];

function getStatusStyles(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "open" || normalized === "invited") {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }
  if (normalized === "booked" || normalized === "confirmed") {
    return "bg-emerald-600 text-white border border-emerald-600";
  }
  if (normalized === "cancelled" || normalized === "canceled") {
    return "bg-rose-50 text-rose-700 border border-rose-200";
  }
  return "bg-gray-100 text-gray-600 border border-gray-200";
}

// helper to turn "HH:MM" + minutes into "HH:MM"
function addMinutesToTime(time: string, minutes: number): string {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m) || isNaN(minutes)) return time;

  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(newH)}:${pad(newM)}`;
}

export default function EmployerInterviewsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const {
    isOpen: isCommandPaletteOpen,
    close: closeCommandPalette,
  } = useCommandPalette();

  const [org, setOrg] = useState<{
    id: number;
    name: string;
    logoUrl?: string | null;
  } | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create-slot UI state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Job + candidate state
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  const [candidates, setCandidates] = useState<CandidateOption[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [selectedApplicationId, setSelectedApplicationId] =
    useState<string>("");

  // Calendly-style date + time chips
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [timeSelections, setTimeSelections] = useState<TimeSelections>({});

  // Shared config
  const [durationMinutes, setDurationMinutes] = useState<string>("30");
  const [locationType, setLocationType] = useState<"online" | "in_person">(
    "online",
  );
  const [locationDetail, setLocationDetail] = useState<string>("");
  const [maxCandidates, setMaxCandidates] = useState<string>("1");
  const [notes, setNotes] = useState<string>("");

  // Slot list filter
  const [slotFilter, setSlotFilter] = useState<SlotFilter>("upcoming");

  // Redirect if not logged in
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  // Load org for this user
  useEffect(() => {
    if (session?.user) {
      loadOrg();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user]);

  // Once org is known, fetch slots + jobs
  useEffect(() => {
    if (org?.id) {
      fetchSlots();
      loadJobs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.id]);

  // When job changes, load candidates
  useEffect(() => {
    if (org?.id && selectedJobId) {
      loadCandidatesForJob(Number(selectedJobId));
    } else {
      setCandidates([]);
      setSelectedApplicationId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org?.id, selectedJobId]);

  const handleSignOut = async () => {
    const { error } = await authClient.signOut();
    if (error?.code) {
      toast.error(error.code);
    } else {
      localStorage.removeItem("bearer_token");
      router.push("/");
    }
  };

  const loadOrg = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const resp = await fetch("/api/organizations?mine=true", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (resp.ok) {
        const orgs = await resp.json();
        if (Array.isArray(orgs) && orgs.length > 0) {
          setOrg({
            id: orgs[0].id,
            name: orgs[0].name,
            logoUrl: orgs[0].logoUrl,
          });
        }
      }
    } catch (e) {
      console.error("Failed to load org:", e);
      toast.error("Failed to load organization");
    } finally {
      setLoadingOrg(false);
    }
  };

  const fetchSlots = async () => {
    if (!org?.id) return;
    try {
      setLoadingSlots(true);
      setRefreshing(true);
      const token = localStorage.getItem("bearer_token");
      const qs = new URLSearchParams({ orgId: String(org.id) });

      const resp = await fetch(`/api/interviews/slots?${qs.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load interview slots");
      }

      const data = await resp.json();
      setSlots(Array.isArray(data.slots) ? data.slots : []);
    } catch (err: any) {
      console.error("fetchSlots error", err);
      toast.error(err.message || "Failed to load interview slots");
    } finally {
      setLoadingSlots(false);
      setRefreshing(false);
    }
  };

  const loadJobs = async () => {
    if (!org?.id) return;
    try {
      setLoadingJobs(true);
      const token = localStorage.getItem("bearer_token");
      const qs = new URLSearchParams({
        orgId: String(org.id),
        status: "published",
        limit: "100",
      });

      const resp = await fetch(`/api/jobs?${qs.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load jobs");
      }

      const data = await resp.json();
      const mapped: JobOption[] = Array.isArray(data)
        ? data.map((j: any) => ({
            id: j.id,
            title: j.title,
          }))
        : [];

      setJobs(mapped);
    } catch (err: any) {
      console.error("loadJobs error", err);
      toast.error(err.message || "Failed to load jobs");
    } finally {
      setLoadingJobs(false);
    }
  };

  const loadCandidatesForJob = async (jobId: number) => {
    if (!org?.id) return;
    try {
      setLoadingCandidates(true);
      const token = localStorage.getItem("bearer_token");
      const qs = new URLSearchParams({
        orgId: String(org.id),
        jobId: String(jobId),
        limit: "200",
      });

      const resp = await fetch(`/api/applications?${qs.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load candidates");
      }

      const data = await resp.json();

      const apps = Array.isArray(data) ? data : data.applications ?? [];

      const mapped: CandidateOption[] = apps.map((a: any) => ({
        applicationId: a.id,
        name: a.applicantName ?? null,
        email: a.applicantEmail,
        stage: a.stage ?? null,
      }));

      setCandidates(mapped);
    } catch (err: any) {
      console.error("loadCandidatesForJob error", err);
      toast.error(err.message || "Failed to load candidates");
    } finally {
      setLoadingCandidates(false);
    }
  };

  const resetCreateForm = () => {
    setSelectedJobId("");
    setSelectedApplicationId("");
    setCandidates([]);
    setSelectedDate(todayISO());
    setTimeSelections({});
    setDurationMinutes("30");
    setLocationType("online");
    setLocationDetail("");
    setMaxCandidates("1");
    setNotes("");
  };

  const toggleTimeForSelectedDate = (time: string) => {
    setTimeSelections((prev) => {
      const existingForDay = prev[selectedDate] ?? [];
      const isSelected = existingForDay.includes(time);
      const nextForDay = isSelected
        ? existingForDay.filter((t) => t !== time)
        : [...existingForDay, time];

      const next: TimeSelections = { ...prev, [selectedDate]: nextForDay };

      if (nextForDay.length === 0) {
        delete next[selectedDate];
      }

      return next;
    });
  };

  const handleCreateSlot = async () => {
    if (!org?.id) {
      toast.error("Organization not loaded");
      return;
    }

    if (!selectedJobId) {
      toast.error("Please select a job");
      return;
    }

    if (!selectedApplicationId) {
      toast.error("Please select a candidate");
      return;
    }

    const duration = parseInt(durationMinutes, 10);
    if (isNaN(duration) || duration <= 0) {
      toast.error("Duration must be a positive number of minutes");
      return;
    }

    const maxCand = parseInt(maxCandidates, 10);
    if (isNaN(maxCand) || maxCand <= 0) {
      toast.error("Max candidates must be a positive number");
      return;
    }

    // Flatten date -> times map into [{ date, startTime }]
    const selectedPairs: { date: string; startTime: string }[] = [];
    Object.entries(timeSelections).forEach(([date, times]) => {
      times.forEach((t) => {
        if (date && t) {
          selectedPairs.push({ date, startTime: t });
        }
      });
    });

    if (selectedPairs.length === 0) {
      toast.error("Please select at least one date and time");
      return;
    }

    try {
      setCreating(true);
      const token = localStorage.getItem("bearer_token");

      const createdSlots: InterviewSlot[] = [];

      for (const opt of selectedPairs) {
        const start = new Date(`${opt.date}T${opt.startTime}:00`);
        if (isNaN(start.getTime())) {
          throw new Error("Invalid date or time in one of the options");
        }
        const end = new Date(start.getTime() + duration * 60 * 1000);

        const body = {
          orgId: org.id,
          jobId: Number(selectedJobId),
          applicationId: Number(selectedApplicationId),
          startAt: start.toISOString(),
          endAt: end.toISOString(),
          locationType,
          locationDetail: locationDetail || null,
          maxCandidates: maxCand,
          notes: notes || null,
        };

        const resp = await fetch("/api/interviews/slots", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(body),
        });

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err.error || "Failed to create one of the slots");
        }

        const data = await resp.json();
        if (data.slot) {
          createdSlots.push(data.slot as InterviewSlot);
        }
      }

      if (createdSlots.length > 0) {
        toast.success(
          `Created ${createdSlots.length} interview option${
            createdSlots.length > 1 ? "s" : ""
          }`,
        );
        setSlots((prev) => [...createdSlots, ...prev]);
      }

      resetCreateForm();
      setIsCreateOpen(false);
    } catch (err: any) {
      console.error("handleCreateSlot error", err);
      toast.error(err.message || "Failed to create interview slots");
    } finally {
      setCreating(false);
    }
  };

  // ⚠️ All hooks (including useMemo) must be above any early returns

  // Derive a flat list of selected date+times for display
  const selectedPairsDisplay: { date: string; startTime: string }[] = [];
  Object.entries(timeSelections).forEach(([date, times]) => {
    times.forEach((t) => {
      selectedPairsDisplay.push({ date, startTime: t });
    });
  });

  const now = new Date();

  const filteredSlots = useMemo(() => {
    if (slotFilter === "all") return slots;
    return slots.filter((slot) => new Date(slot.startAt) >= now);
  }, [slots, slotFilter, now]);

  const groupedSlots = useMemo(() => {
    const acc: Record<string, InterviewSlot[]> = {};
    filteredSlots.forEach((slot) => {
      const dateKey = new Date(slot.startAt).toISOString().slice(0, 10);
      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(slot);
    });
    return acc;
  }, [filteredSlots]);

  const orderedDates = useMemo(
    () =>
      Object.keys(groupedSlots).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime(),
      ),
    [groupedSlots],
  );

  const selectedJob = selectedJobId
    ? jobs.find((j) => String(j.id) === selectedJobId)
    : undefined;

  const selectedCandidate = selectedApplicationId
    ? candidates.find(
        (c) => String(c.applicationId) === selectedApplicationId,
      )
    : undefined;

  // Loading guards AFTER all hooks
  if (isPending || loadingOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.user) return null;

  // Precompute duration as number for selected summary
  const durationInt = parseInt(durationMinutes, 10);

  return (
    <div className="min-h-screen bg-[#FEFEFA] flex">
      {/* Left Sidebar */}
      <CompanySidebar
        org={org}
        user={session.user || null}
        onSignOut={handleSignOut}
        onOpenSettings={() => setIsSettingsOpen(true)}
        active="interviews"
      />

      {/* Main content */}
      <main className="flex-1 bg-[#FEFEFA] overflow-y-auto">
        <div className="p-8">
          <div className="max-w-6xl mx-auto">
            {/* Breadcrumb */}
            <div className="flex items-center gap-4 mb-8">
              <nav className="flex items-center gap-2 text-sm">
                <Link
                  href="/dashboard"
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Dashboard
                </Link>
                <span className="text-gray-400">&gt;</span>
                <span className="text-gray-900 font-medium">Interviews</span>
              </nav>
            </div>

            {/* Header + actions */}
            <div className="bg-white rounded-xl shadow-sm p-5 mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  Interview Schedule
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    Company view
                  </span>
                </h1>
                <p className="text-sm text-gray-500">
                  Create Calendly-style options for each candidate and keep your
                  interview calendar organized.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={fetchSlots}
                  disabled={refreshing}
                  className="flex items-center gap-2 text-sm"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                  />
                  Refresh
                </Button>

                <Button
                  onClick={() => setIsCreateOpen((v) => !v)}
                  className="flex items-center gap-2 text-sm"
                >
                  <Clock className="w-4 h-4" />
                  {isCreateOpen ? "Close form" : "New time options"}
                </Button>
              </div>
            </div>

            {/* Stack content vertically: form (if open) then slots */}
            <div className="grid gap-6">
              {/* Create slot form */}
              {isCreateOpen && (
                <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-1">
                      <h2 className="text-md font-semibold text-gray-900">
                        Create interview time options
                      </h2>
                      <p className="text-sm text-gray-500">
                        Go from job → candidate → times → details in a few
                        clicks.
                      </p>
                    </div>

                    {/* Step bullets */}
                    <div className="flex items-center gap-2 text-[11px] text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-semibold">
                          1
                        </span>
                        Job
                      </span>
                      <span className="h-px w-4 bg-gray-200" />
                      <span className="inline-flex items-center gap-1">
                        <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-semibold">
                          2
                        </span>
                        Candidate
                      </span>
                      <span className="h-px w-4 bg-gray-200" />
                      <span className="inline-flex items-center gap-1">
                        <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-semibold">
                          3
                        </span>
                        Times
                      </span>
                      <span className="h-px w-4 bg-gray-200" />
                      <span className="inline-flex items-center gap-1">
                        <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-semibold">
                          4
                        </span>
                        Details
                      </span>
                    </div>
                  </div>

                  {/* Context chip when job & candidate selected */}
                  {selectedJob && selectedCandidate && (
                    <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-xs text-emerald-800 flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          <span className="font-medium">
                            {selectedJob.title}
                          </span>
                        </span>
                        <span className="h-3 w-px bg-emerald-200" />
                        <span className="inline-flex items-center gap-1">
                          <User2 className="w-3 h-3" />
                          <span className="font-medium">
                            {selectedCandidate.name || selectedCandidate.email}
                          </span>
                          {selectedCandidate.stage && (
                            <span className="text-[11px] text-emerald-700/80">
                              · {selectedCandidate.stage}
                            </span>
                          )}
                        </span>
                      </div>
                      <span className="text-[11px]">
                        You&apos;re sending them{" "}
                        <span className="font-semibold">
                          {selectedPairsDisplay.length || "0"} time option
                          {selectedPairsDisplay.length === 1 ? "" : "s"}
                        </span>
                        .
                      </span>
                    </div>
                  )}

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {/* Job select */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-700">
                        Job
                      </label>
                      <Select
                        value={selectedJobId}
                        onValueChange={(value) => {
                          setSelectedJobId(value);
                          setSelectedApplicationId("");
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              loadingJobs ? "Loading jobs..." : "Select a job"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {jobs.map((job) => (
                            <SelectItem key={job.id} value={String(job.id)}>
                              {job.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {selectedJob
                          ? "Job selected."
                          : "Choose the job this interview is for."}
                      </p>
                    </div>

                    {/* Candidate select */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-700">
                        Candidate
                      </label>
                      <Select
                        value={selectedApplicationId}
                        onValueChange={setSelectedApplicationId}
                        disabled={!selectedJobId || loadingCandidates}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              !selectedJobId
                                ? "Select a job first"
                                : loadingCandidates
                                ? "Loading candidates..."
                                : "Select a candidate"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {candidates.map((c) => (
                            <SelectItem
                              key={c.applicationId}
                              value={String(c.applicationId)}
                            >
                              {c.name || c.email}
                              {c.stage ? ` · ${c.stage}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {selectedCandidate
                          ? "Candidate selected."
                          : "Search and pick one applicant for this job."}
                      </p>
                    </div>

                    {/* Calendly-style date + time grid */}
                    <div className="space-y-3 md:col-span-2">
                      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_2fr]">
                        {/* Date picker */}
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-gray-700">
                            Choose a date
                          </label>
                          <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                          />
                          <p className="text-[11px] text-gray-400">
                            Pick a date, then select one or more time slots.
                          </p>
                          <p className="text-[11px] text-gray-400">
                            Times are created in your organization&apos;s local
                            time.
                          </p>
                        </div>

                        {/* Time slots grid */}
                        <div className="space-y-2">
                          <label className="block text-xs font-medium text-gray-700">
                            Available times
                          </label>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                            {TIME_SLOTS.map((t) => {
                              const selectedForDay =
                                timeSelections[selectedDate] ?? [];
                              const isSelected = selectedForDay.includes(t);
                              return (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => toggleTimeForSelectedDate(t)}
                                  className={[
                                    "text-xs rounded-md border px-2 py-1 transition",
                                    isSelected
                                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 font-medium shadow-sm"
                                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50",
                                  ].join(" ")}
                                >
                                  {t}
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-[11px] text-gray-400">
                            Click to toggle times on or off for{" "}
                            <span className="font-medium">{selectedDate}</span>.
                            You can change the date and pick times for multiple
                            days.
                          </p>
                        </div>
                      </div>

                      {/* Selected summary - grouped by date with ranges */}
                      <div className="space-y-1">
                        <span className="text-[11px] font-medium text-gray-700">
                          Selected options
                        </span>
                        {selectedPairsDisplay.length === 0 ? (
                          <p className="text-[11px] text-gray-400">
                            No times selected yet.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {Object.entries(
                              selectedPairsDisplay.reduce(
                                (acc, opt) => {
                                  if (!acc[opt.date]) {
                                    acc[opt.date] = [];
                                  }
                                  acc[opt.date].push(opt.startTime);
                                  return acc;
                                },
                                {} as Record<string, string[]>,
                              ),
                            )
                              .sort((a, b) => a[0].localeCompare(b[0]))
                              .map(([date, times]) => {
                                const sortedTimes = [...times].sort((a, b) =>
                                  a.localeCompare(b),
                                );
                                const labelTimes = sortedTimes.map((t) => {
                                  const hasDuration =
                                    !isNaN(durationInt) && durationInt > 0;
                                  const end = hasDuration
                                    ? addMinutesToTime(t, durationInt)
                                    : "";
                                  return hasDuration ? `${t}–${end}` : t;
                                });
                                return (
                                  <div
                                    key={date}
                                    className="flex items-start gap-3 text-[11px]"
                                  >
                                    <span className="font-medium text-gray-700 w-28">
                                      {date}
                                    </span>
                                    <div className="flex flex-wrap gap-1">
                                      {labelTimes.map((label, idx) => (
                                        <span
                                          key={`${date}-${label}-${idx}`}
                                          className="inline-flex items-center rounded-full border border-emerald-500 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700"
                                        >
                                          {label}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-gray-400">
                        We&apos;ll create one invited slot for each selected
                        date/time combination, all tied to this candidate and
                        job.
                      </p>
                    </div>

                    {/* Duration */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-700">
                        Duration (minutes)
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(e.target.value)}
                      />
                    </div>

                    {/* Location type */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-700">
                        Location type
                      </label>
                      <Select
                        value={locationType}
                        onValueChange={(v) =>
                          setLocationType(v as "online" | "in_person")
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="online">Online</SelectItem>
                          <SelectItem value="in_person">In-person</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Location detail */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-700">
                        Location detail
                      </label>
                      <Input
                        placeholder={
                          locationType === "online"
                            ? "Zoom/Meet link"
                            : "Office address"
                        }
                        value={locationDetail}
                        onChange={(e) => setLocationDetail(e.target.value)}
                      />
                    </div>

                    {/* Max candidates (still per-candidate = 1 but we keep field for future) */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-700">
                        Max candidates
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={maxCandidates}
                        onChange={(e) => setMaxCandidates(e.target.value)}
                      />
                      <p className="text-[11px] text-gray-400">
                        For now, per-candidate slots will typically use 1.
                      </p>
                    </div>

                    {/* Notes */}
                    <div className="space-y-2 md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700">
                        Notes (optional)
                      </label>
                      <Textarea
                        rows={2}
                        placeholder="Internal notes about this slot (panel, focus, etc.)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-[11px] text-gray-400">
                      These options will appear to the candidate on their
                      interview booking page.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          resetCreateForm();
                          setIsCreateOpen(false);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleCreateSlot}
                        disabled={creating}
                      >
                        {creating ? "Creating..." : "Create time options"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Slots list */}
              <Card className="bg-white rounded-xl shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      Upcoming interview slots
                    </CardTitle>
                    <p className="text-xs text-gray-500 mt-1">
                      Each slot is tied to a specific candidate and job.
                    </p>
                  </div>

                  {/* Filter pills */}
                  <div className="inline-flex items-center rounded-full bg-gray-100 p-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSlotFilter("upcoming")}
                      className={[
                        "px-3 py-1 rounded-full transition",
                        slotFilter === "upcoming"
                          ? "bg-white shadow-sm text-emerald-700 font-medium"
                          : "text-gray-600 hover:text-gray-800",
                      ].join(" ")}
                    >
                      Upcoming
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlotFilter("all")}
                      className={[
                        "px-3 py-1 rounded-full transition",
                        slotFilter === "all"
                          ? "bg-white shadow-sm text-emerald-700 font-medium"
                          : "text-gray-600 hover:text-gray-800",
                      ].join(" ")}
                    >
                      All
                    </button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingSlots ? (
                    <div className="space-y-2">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : filteredSlots.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-500">
                      <p className="mb-2">No interview slots yet.</p>
                      <p>
                        Use the{" "}
                        <span className="font-medium">New time options</span>{" "}
                        form above to create your first candidate-specific
                        options.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orderedDates.map((dateKey) => {
                        const dateSlots = groupedSlots[dateKey] || [];
                        const humanDate = new Date(dateKey).toLocaleDateString(
                          undefined,
                          {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        );
                        return (
                          <div key={dateKey} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-900">
                                  {humanDate}
                                </span>
                                <span className="text-[11px] text-gray-400">
                                  {dateSlots.length} slot
                                  {dateSlots.length === 1 ? "" : "s"}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2">
                              {dateSlots.map((slot) => (
                                <div
                                  key={slot.id}
                                  className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm bg-[#FEFEFA]"
                                >
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-medium text-gray-900">
                                        {new Date(
                                          slot.startAt,
                                        ).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}{" "}
                                        -{" "}
                                        {new Date(
                                          slot.endAt,
                                        ).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                      {slot.jobTitle && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-white border border-gray-200 px-2 py-0.5 text-[11px] text-gray-700">
                                          <Briefcase className="w-3 h-3" />
                                          {slot.jobTitle}
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                      <span className="inline-flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(
                                          slot.startAt,
                                        ).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                      <span className="inline-flex items-center gap-1">
                                        <MapPin className="w-3 h-3" />
                                        {slot.locationType.toUpperCase()}{" "}
                                        {slot.locationDetail
                                          ? `· ${slot.locationDetail}`
                                          : ""}
                                      </span>
                                      <span>
                                        Max candidates:{" "}
                                        <span className="font-medium">
                                          {slot.maxCandidates}
                                        </span>
                                      </span>
                                      {slot.candidateName ||
                                      slot.candidateEmail ? (
                                        <span className="inline-flex items-center gap-1">
                                          <User2 className="w-3 h-3" />
                                          {slot.candidateName ||
                                            slot.candidateEmail}
                                          {slot.candidateStage && (
                                            <span className="text-[11px] text-gray-400">
                                              {" "}
                                              · {slot.candidateStage}
                                            </span>
                                          )}
                                        </span>
                                      ) : null}
                                    </div>

                                    {slot.notes && (
                                      <div className="text-xs text-gray-500">
                                        Notes:{" "}
                                        <span className="italic">
                                          {slot.notes}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-right space-y-1">
                                    <div
                                      className={[
                                        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] capitalize",
                                        getStatusStyles(slot.status),
                                      ].join(" ")}
                                    >
                                      {slot.status}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        orgId={org?.id}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        organization={
          org
            ? {
                id: org.id,
                name: org.name,
                slug: "",
                type: "company",
                plan: "free",
                seatLimit: 5,
                createdAt: "",
                updatedAt: "",
              }
            : null
        }
      />
    </div>
  );
}
