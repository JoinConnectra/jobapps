// /src/app/dashboard/interviews/page.tsx
"use client";

import { useEffect, useState } from "react";
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
  PlusCircle,
  X,
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

type TimeOption = {
  date: string;
  startTime: string;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function EmployerInterviewsPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const {
    isOpen: isCommandPaletteOpen,
    open: openCommandPalette,
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
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>("");

  // Multiple time options for the SAME candidate
  const [timeOptions, setTimeOptions] = useState<TimeOption[]>([
    { date: todayISO(), startTime: "10:00" },
  ]);

  // Shared config
  const [durationMinutes, setDurationMinutes] = useState<string>("30");
  const [locationType, setLocationType] = useState<"online" | "in_person">(
    "online",
  );
  const [locationDetail, setLocationDetail] = useState<string>("");
  const [maxCandidates, setMaxCandidates] = useState<string>("1");
  const [notes, setNotes] = useState<string>("");

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
    setTimeOptions([{ date: todayISO(), startTime: "10:00" }]);
    setDurationMinutes("30");
    setLocationType("online");
    setLocationDetail("");
    setMaxCandidates("1");
    setNotes("");
  };

  const handleAddTimeOption = () => {
    setTimeOptions((prev) => [
      ...prev,
      { date: todayISO(), startTime: "10:00" },
    ]);
  };

  const handleRemoveTimeOption = (index: number) => {
    setTimeOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateTimeOption = (
    index: number,
    field: keyof TimeOption,
    value: string,
  ) => {
    setTimeOptions((prev) =>
      prev.map((opt, i) =>
        i === index ? { ...opt, [field]: value } : opt,
      ),
    );
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

    const validOptions = timeOptions.filter(
      (opt) => opt.date && opt.startTime,
    );

    if (validOptions.length === 0) {
      toast.error("Please add at least one date and start time");
      return;
    }

    try {
      setCreating(true);
      const token = localStorage.getItem("bearer_token");

      const createdSlots: InterviewSlot[] = [];

      for (const opt of validOptions) {
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

  if (isPending || loadingOrg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFEFA]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session?.user) return null;

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
                  Send candidate-specific interview time options and track their
                  bookings.
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

            {/* Create slot form */}
            {isCreateOpen && (
              <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-gray-200">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <h2 className="text-md font-semibold text-gray-900">
                      Create interview time options
                    </h2>
                    <p className="text-sm text-gray-500">
                      Pick a job, candidate, and one or more times to invite
                      them for an interview.
                    </p>
                  </div>
                </div>

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
                      <SelectTrigger>
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
                    <p className="text-[11px] text-gray-400">
                      Choose the job this interview is for.
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
                      <SelectTrigger>
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
                    <p className="text-[11px] text-gray-400">
                      Search and pick one applicant for this job.
                    </p>
                  </div>

                  {/* Time options (multiple rows) */}
                  <div className="space-y-3 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-gray-700">
                        Time options
                      </label>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={handleAddTimeOption}
                        className="h-7 px-2 text-xs"
                      >
                        <PlusCircle className="w-3 h-3 mr-1" />
                        Add another time
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {timeOptions.map((opt, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2 items-end"
                        >
                          <div className="space-y-2">
                            <label className="block text-[11px] font-medium text-gray-700">
                              Date
                            </label>
                            <Input
                              type="date"
                              value={opt.date}
                              onChange={(e) =>
                                handleUpdateTimeOption(
                                  index,
                                  "date",
                                  e.target.value,
                                )
                              }
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="block text-[11px] font-medium text-gray-700">
                              Start time
                            </label>
                            <Input
                              type="time"
                              value={opt.startTime}
                              onChange={(e) =>
                                handleUpdateTimeOption(
                                  index,
                                  "startTime",
                                  e.target.value,
                                )
                              }
                            />
                          </div>

                          <div className="flex md:justify-end">
                            {timeOptions.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleRemoveTimeOption(index)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-[11px] text-gray-400">
                      We&apos;ll create one invited slot for each time option,
                      all tied to this candidate and job.
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

                <div className="mt-4 flex justify-end gap-3">
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
            )}

            {/* Slots list */}
            <Card className="bg-white rounded-xl shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">
                    Upcoming interview slots
                  </CardTitle>
                  <p className="text-xs text-gray-500 mt-1">
                    Each slot is tied to a specific candidate and job.
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                {loadingSlots ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : slots.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-500">
                    <p className="mb-2">No interview slots yet.</p>
                    <p>
                      Use the{" "}
                      <span className="font-medium">New time options</span> form
                      above to create your first candidate-specific options.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {slots.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm bg-[#FEFEFA]"
                      >
                        <div className="space-y-1">
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            {new Date(slot.startAt).toLocaleString()} &rarr{" "}
                            {new Date(slot.endAt).toLocaleTimeString()}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(slot.startAt).toLocaleDateString()} ·{" "}
                              {new Date(slot.startAt).toLocaleTimeString([], {
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
                            {slot.jobTitle && (
                              <span className="inline-flex items-center gap-1 text-gray-500">
                                <Briefcase className="w-3 h-3" />
                                {slot.jobTitle}
                              </span>
                            )}
                            {slot.jobId && !slot.jobTitle && (
                              <span className="text-gray-400">
                                Job ID:{" "}
                                <span className="font-medium">
                                  {slot.jobId}
                                </span>
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            {(slot.candidateName || slot.candidateEmail) && (
                              <span className="inline-flex items-center gap-1">
                                <User2 className="w-3 h-3" />
                                {slot.candidateName || slot.candidateEmail}
                                {slot.candidateStage
                                  ? ` · ${slot.candidateStage}`
                                  : ""}
                              </span>
                            )}
                          </div>
                          {slot.notes && (
                            <div className="text-xs text-gray-500">
                              Notes: <span className="italic">{slot.notes}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-xs uppercase tracking-wide text-gray-500">
                            {slot.status}
                          </div>
                          {/* Future: add a small menu for edit / cancel */}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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
