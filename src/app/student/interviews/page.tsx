// /src/app/student/dashboard/interviews/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Calendar, Clock, MapPin, Briefcase } from "lucide-react";

type StudentInterview = {
  bookingId: number;
  slotId: number;
  startAt: string;
  endAt: string;
  orgName: string | null;
  jobTitle: string | null;
  status: string; // "invited" | "booked" | ...
  locationType: string;
  locationDetail: string | null;
  applicationId: number | null;
  applicantEmail: string | null;
};

type InviteGroup = {
  key: string;
  jobTitle: string | null;
  orgName: string | null;
  applicationId: number | null;
  options: StudentInterview[];
};

export default function StudentInterviewsPage() {
  const [items, setItems] = useState<StudentInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/interviews/my");

      if (res.status === 401) {
        setErrorMsg("Please sign in to see your interviews.");
        setItems([]);
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to load interviews");
      }

      const data = await res.json();
      setItems(data.interviews ?? []);
      setErrorMsg(null);
    } catch (err) {
      console.error("StudentInterviewsPage error", err);
      setErrorMsg("Failed to load interviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConfirm = async (iv: StudentInterview) => {
    if (!iv.applicationId) {
      toast.error("Missing application for this invite.");
      return;
    }

    try {
      setSubmittingId(iv.bookingId);

      const res = await fetch("/api/interviews/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: iv.slotId,
          applicationId: iv.applicationId,
          applicantEmail: iv.applicantEmail ?? undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to confirm interview");
      }

      toast.success("Interview time confirmed");

      // Optimistically update status to "booked"
      setItems((prev) =>
        prev.map((item) =>
          item.bookingId === iv.bookingId
            ? { ...item, status: "booked" }
            : item,
        ),
      );
    } catch (err: any) {
      console.error("handleConfirm error", err);
      toast.error(err.message || "Failed to confirm interview");
    } finally {
      setSubmittingId(null);
    }
  };

  const invites = items.filter((iv) => iv.status === "invited");
  const confirmed = items.filter((iv) => iv.status !== "invited");

  // Group invites so you don't see each availability as a separate big card
  const groupedInvites: InviteGroup[] = useMemo(() => {
    const map: Record<string, InviteGroup> = {};

    invites.forEach((iv) => {
      const key =
        iv.applicationId != null
          ? `app-${iv.applicationId}`
          : `${iv.orgName ?? "Org"}-${iv.jobTitle ?? "Role"}`;

      if (!map[key]) {
        map[key] = {
          key,
          jobTitle: iv.jobTitle,
          orgName: iv.orgName,
          applicationId: iv.applicationId,
          options: [],
        };
      }
      map[key].options.push(iv);
    });

    // Sort options in each group by time
    Object.values(map).forEach((group) => {
      group.options.sort(
        (a, b) =>
          new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
      );
    });

    // Sort groups by earliest option
    return Object.values(map).sort((a, b) => {
      const aTime = new Date(a.options[0].startAt).getTime();
      const bTime = new Date(b.options[0].startAt).getTime();
      return aTime - bTime;
    });
  }, [invites]);

  const formatDateRange = (iv: StudentInterview) => {
    const start = new Date(iv.startAt);
    const end = new Date(iv.endAt);
    const dateStr = start.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    const startTime = start.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const endTime = end.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    return { dateStr, startTime, endTime };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl bg-white border border-gray-200 px-4 py-4 sm:px-6 sm:py-5 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <Calendar className="h-4 w-4" />
          </span>
          <div>
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900">
              My Interviews
            </h1>
            <p className="text-sm text-slate-600">
              Review invitations, pick a time that works for you, and keep track
              of upcoming interviews.
            </p>
          </div>
        </div>
      </div>

      {/* Pending invitations */}
      <Card className="border border-emerald-100/80 shadow-sm rounded-xl">
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Pending invitations
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              For each interview, choose one time that works best for you.
            </p>
          </div>
          {invites.length > 0 && !loading && !errorMsg && (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 border border-emerald-100">
              {invites.length} open time option
              {invites.length === 1 ? "" : "s"}
            </span>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ) : errorMsg ? (
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
          ) : groupedInvites.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You don&apos;t have any pending interview invitations.
            </p>
          ) : (
            <div className="space-y-4">
              {groupedInvites.map((group) => {
                const first = group.options[0];
                const { dateStr } = formatDateRange(first);

                return (
                  <div
                    key={group.key}
                    className="rounded-lg border border-emerald-100 bg-emerald-50/40 px-3 py-3 sm:px-4 sm:py-4 space-y-3"
                  >
                    {/* Header row per interview (job + company) */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900">
                            <Briefcase className="h-4 w-4 text-emerald-700" />
                            {group.jobTitle || "Interview"}
                          </span>
                          {group.orgName && (
                            <span className="text-xs text-slate-600">
                              · {group.orgName}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {group.options.length} time option
                          {group.options.length === 1 ? "" : "s"} available ·
                          starting {dateStr}
                        </p>
                      </div>
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 border border-amber-100 uppercase tracking-wide">
                        Invited
                      </span>
                    </div>

                    {/* Time options list */}
                    <div className="space-y-2">
                      {group.options.map((iv) => {
                        const { dateStr, startTime, endTime } =
                          formatDateRange(iv);

                        return (
                          <div
                            key={iv.bookingId}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border border-emerald-100 bg-white/80 px-3 py-2 text-xs sm:text-[13px]"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center gap-1 font-medium text-slate-900">
                                  <Calendar className="h-3 w-3 text-slate-500" />
                                  {dateStr}
                                </span>
                                <span className="inline-flex items-center gap-1 text-slate-700">
                                  <Clock className="h-3 w-3 text-slate-500" />
                                  {startTime} – {endTime}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500">
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-slate-400" />
                                  {iv.locationType.toUpperCase()}{" "}
                                  {iv.locationDetail
                                    ? `· ${iv.locationDetail}`
                                    : ""}
                                </span>
                              </div>
                            </div>
                            <div className="flex sm:items-center sm:justify-end">
                              <Button
                                size="sm"
                                className="text-xs"
                                onClick={() => handleConfirm(iv)}
                                disabled={submittingId === iv.bookingId}
                              >
                                {submittingId === iv.bookingId
                                  ? "Confirming..."
                                  : "Choose this time"}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Once you confirm a time, it will move into your scheduled
                      interviews.
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scheduled interviews */}
      <Card className="shadow-sm rounded-xl">
        <CardHeader className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              Scheduled interviews
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              All interviews you&apos;ve already confirmed.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ) : errorMsg ? (
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
          ) : confirmed.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You don&apos;t have any confirmed interviews yet.
            </p>
          ) : (
            <div className="space-y-3">
              {confirmed
                .slice()
                .sort(
                  (a, b) =>
                    new Date(a.startAt).getTime() -
                    new Date(b.startAt).getTime(),
                )
                .map((iv) => {
                  const { dateStr, startTime, endTime } = formatDateRange(iv);
                  return (
                    <div
                      key={iv.bookingId}
                      className="flex flex-col gap-2 rounded-lg border px-3 py-2.5 text-sm bg-slate-50/80"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-slate-900">
                              {iv.jobTitle || "Interview"}
                            </span>
                            {iv.orgName && (
                              <span className="text-xs text-slate-600">
                                · {iv.orgName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-slate-500" />
                              {dateStr}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-500" />
                              {startTime} – {endTime}
                            </span>
                          </div>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 border border-emerald-100 uppercase tracking-wide">
                          {iv.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {iv.locationType.toUpperCase()}{" "}
                        {iv.locationDetail ? `· ${iv.locationDetail}` : ""}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
