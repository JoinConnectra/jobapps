// /src/app/student/dashboard/interviews/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
      if (!errorMsg) {
        setErrorMsg("Failed to load interviews.");
      }
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          My Interviews
        </h1>
        <p className="text-sm text-muted-foreground">
          See your interview invitations and confirmed interviews in one place.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending invitations</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : errorMsg ? (
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
          ) : invites.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You don&apos;t have any pending interview invitations.
            </p>
          ) : (
            <div className="space-y-2">
              {invites.map((iv) => (
                <div
                  key={iv.bookingId}
                  className="flex flex-col gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex justify-between items-center">
                    <div className="font-medium">
                      {iv.jobTitle || "Interview"}{" "}
                      {iv.orgName ? `· ${iv.orgName}` : ""}
                    </div>
                    <div className="text-xs uppercase tracking-wide text-amber-600">
                      {iv.status}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(iv.startAt).toLocaleString()} &rarr;{" "}
                    {new Date(iv.endAt).toLocaleTimeString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {iv.locationType.toUpperCase()}{" "}
                    {iv.locationDetail ? `· ${iv.locationDetail}` : ""}
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => handleConfirm(iv)}
                      disabled={submittingId === iv.bookingId}
                    >
                      {submittingId === iv.bookingId
                        ? "Confirming..."
                        : "Confirm this time"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scheduled interviews</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : errorMsg ? (
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
          ) : confirmed.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You don&apos;t have any confirmed interviews yet.
            </p>
          ) : (
            <div className="space-y-2">
              {confirmed.map((iv) => (
                <div
                  key={iv.bookingId}
                  className="flex flex-col rounded-md border px-3 py-2 text-sm"
                >
                  <div className="flex justify-between">
                    <div className="font-medium">
                      {iv.jobTitle || "Interview"}{" "}
                      {iv.orgName ? `· ${iv.orgName}` : ""}
                    </div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      {iv.status}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(iv.startAt).toLocaleString()} &rarr;{" "}
                    {new Date(iv.endAt).toLocaleTimeString()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {iv.locationType.toUpperCase()}{" "}
                    {iv.locationDetail ? `· ${iv.locationDetail}` : ""}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
