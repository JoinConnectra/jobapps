"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type StudentInterview = {
  bookingId: number;
  slotId: number;
  startAt: string;
  endAt: string;
  orgName: string | null;
  jobTitle: string | null;
  status: string;
  locationType: string;
  locationDetail: string | null;
};

export default function StudentInterviewsPage() {
  const [items, setItems] = useState<StudentInterview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/interviews/my");
        if (!res.ok) throw new Error("Failed to load interviews");
        const data = await res.json();
        setItems(data.interviews ?? []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          My Interviews
        </h1>
        <p className="text-sm text-muted-foreground">
          See all of your upcoming and past interviews in one place.
        </p>
      </div>

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
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You don&apos;t have any interviews scheduled yet.
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((iv) => (
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
