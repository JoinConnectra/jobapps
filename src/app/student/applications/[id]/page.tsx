"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { absoluteUrl } from "@/lib/url";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Calendar,
  ClipboardList,
  Clock,
  Download,
  FileText,
  Link as LinkIcon,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  Send,
  User,
  X,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";

type Stage =
  | "submitted"
  | "in_review"
  | "assessment"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

type Application = {
  id: number;
  stage?: Stage;
  appliedAt?: string | null;
  updatedAt?: string | null;
  source?: string | null;
  job?: {
    id: number;
    title: string | null;
    descriptionMd?: string | null;
    locationMode?: string | null;
    salaryRange?: string | null;
    organization?: { name?: string | null; website?: string | null } | null;
  } | null;
  answers?: Array<{ questionId: number; prompt: string; kind?: "text" | "voice"; answerText?: string | null; audioUrl?: string | null }>;
  attachments?: Array<{ name: string; url: string }>;
  timeline?: Array<{ at: string; label: string }>;
};

const STAGE_LABEL: Record<Stage, string> = {
  submitted: "Submitted",
  in_review: "In Review",
  assessment: "Assessment",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export default function ApplicationDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const url = await absoluteUrl(`/api/student/applications/${params.id}`);
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load (${res.status})`);
        const app: Application = await res.json();
        setData(app);
      } catch (e: any) {
        console.error(e);
        toast.error(e?.message ?? "Failed to load application");
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  const org = data?.job?.organization?.name ?? "—";
  const title = data?.job?.title ?? "Untitled role";
  const website = data?.job?.organization?.website ?? null;

  const timeline = useMemo(() => {
    const base: Array<{ at: string; label: string }> = [];
    if (data?.appliedAt) base.push({ at: data.appliedAt, label: "Application submitted" });
    if (data?.timeline?.length) base.push(...data.timeline);
    if (data?.updatedAt && (!base.length || data.updatedAt !== base[base.length - 1].at)) {
      base.push({ at: data.updatedAt, label: "Last update" });
    }
    return base.sort((a, b) => +new Date(a.at) - +new Date(b.at));
  }, [data]);

  const withdraw = async () => {
    try {
      const url = await absoluteUrl(`/api/student/applications/${params.id}/withdraw`);
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) throw new Error(`Failed to withdraw (${res.status})`);
      toast.success("Application withdrawn");
      router.push("/student/applications");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to withdraw");
    }
  };

  const downloadPackage = () => {
    toast.message("Downloads are placeholders", {
      description: "Wire to resume/cover-letter blob endpoints as needed.",
    });
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="grid gap-4 md:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="p-8 text-center">
            <X className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">Application not found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={downloadPackage}>
            <Download className="mr-2 h-4 w-4" />
            Download Package
          </Button>
          {data.stage !== "withdrawn" && data.stage !== "rejected" ? (
            <Button variant="destructive" onClick={withdraw}>
              <X className="mr-2 h-4 w-4" />
              Withdraw
            </Button>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <Check className="h-3.5 w-3.5" />
              Closed
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Left: Overview */}
        <Card className="md:col-span-2 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">
              {title}
              <span className="text-muted-foreground"> @ {org}</span>
            </CardTitle>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusPill stage={data.stage ?? "submitted"} />
              {data.job?.locationMode && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {data.job.locationMode}
                </span>
              )}
              {data.job?.salaryRange && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  <ClipboardList className="h-3.5 w-3.5" />
                  {data.job.salaryRange}
                </span>
              )}
              {data.source && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                  <LinkIcon className="h-3.5 w-3.5" />
                  Source: {data.source}
                </span>
              )}
              {website && (
                <a
                  href={website}
                  target="_blank"
                  className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  <LinkIcon className="h-3.5 w-3.5" />
                  Company Site
                </a>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Timeline */}
            <section>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">Timeline</h3>
              <div className="space-y-3">
                {timeline.map((t, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{t.label}</span>
                      <span className="text-muted-foreground">
                        • {dayjs(t.at).format("MMM D, YYYY h:mm A")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <Separator />

            {/* Q&A / Assessments */}
            {!!data.answers?.length && (
              <section>
                <h3 className="mb-3 text-sm font-medium text-muted-foreground">Your Responses</h3>
                <div className="space-y-3">
                  {data.answers.map((qa) => (
                    <Card key={qa.questionId} className="border-muted/60">
                      <CardContent className="space-y-2 p-4">
                        <p className="text-sm font-medium">{qa.prompt}</p>
                        {qa.kind === "voice" && qa.audioUrl ? (
                          <audio controls src={qa.audioUrl} className="w-full" />
                        ) : (
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {qa.answerText || "—"}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Attachments */}
            {!!data.attachments?.length && (
              <>
                <Separator />
                <section>
                  <h3 className="mb-3 text-sm font-medium text-muted-foreground">Attachments</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {data.attachments.map((f) => (
                      <Card key={f.url} className="border-muted/60">
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{f.name}</span>
                          </div>
                          <a
                            className="text-sm text-primary underline-offset-2 hover:underline"
                            href={f.url}
                            target="_blank"
                          >
                            Download
                          </a>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              </>
            )}
          </CardContent>
        </Card>

        {/* Right: Key details */}
        <div className="space-y-4">
          <Card className="rounded-2xl">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  Applied:{" "}
                  <strong>{data.appliedAt ? dayjs(data.appliedAt).format("MMM D, YYYY") : "—"}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  Last update:{" "}
                  <strong>{data.updatedAt ? dayjs(data.updatedAt).fromNow() : "—"}</strong>
                </span>
              </div>
              {data.source && (
                <div className="flex items-center gap-2 text-sm">
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  <span>Source: <strong>{data.source}</strong></span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="space-y-3 p-5">
              <h3 className="text-sm font-medium text-muted-foreground">Next Steps</h3>
              <div className="grid gap-2">
                <Button variant="outline">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Draft follow-up email
                </Button>
                <Button variant="outline">
                  <Phone className="mr-2 h-4 w-4" />
                  Add reminder
                </Button>
                <Button>
                  <Send className="mr-2 h-4 w-4" />
                  Mark step done
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="space-y-3 p-5">
              <h3 className="text-sm font-medium text-muted-foreground">Recruiter</h3>
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-muted">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{org} Team</p>
                  <p className="truncate text-xs text-muted-foreground">via portal</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ stage }: { stage: Stage }) {
  const color =
    stage === "offer"
      ? "bg-emerald-100 text-emerald-800"
      : stage === "interview"
      ? "bg-blue-100 text-blue-800"
      : stage === "rejected" || stage === "withdrawn"
      ? "bg-rose-100 text-rose-800"
      : stage === "assessment"
      ? "bg-amber-100 text-amber-800"
      : stage === "in_review"
      ? "bg-neutral-100 text-neutral-800"
      : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${color}`}>
      {STAGE_LABEL[stage]}
    </span>
  );
}

function SkeletonCard() {
  return (
    <Card className="rounded-2xl">
      <CardContent className="space-y-3 p-5">
        <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
      </CardContent>
    </Card>
  );
}
