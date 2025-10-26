"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  jobId: number | string;
  jobTitle: string;
};

export default function ApplyDialog({ open, onOpenChange, jobId, jobTitle }: Props) {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [linkedinUrl, setLinkedinUrl] = React.useState("");
  const [portfolioUrl, setPortfolioUrl] = React.useState("");
  const [resumeUrl, setResumeUrl] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function submit() {
    if (!email || !email.includes("@")) {
      alert("Please enter a valid email.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          applicantEmail: email,
          applicantName: name || undefined,
          phone: phone || undefined,
          linkedinUrl: linkedinUrl || undefined,
          portfolioUrl: portfolioUrl || undefined,
          resumeUrl: resumeUrl || undefined,
          source: "student-portal",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to submit application");
      }
      onOpenChange(false);
      setName(""); setEmail(""); setPhone("");
      setLinkedinUrl(""); setPortfolioUrl(""); setResumeUrl("");
      alert("Application submitted! 🎉");
    } catch (err: any) {
      alert(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <button className="hidden" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply to {jobTitle}</DialogTitle>
          <DialogDescription>
            Share your contact details and links. We’ll send them to the employer with your application.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <Input placeholder="Full name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="Email *" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input placeholder="LinkedIn (optional)" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} />
          <Input placeholder="Portfolio / GitHub (optional)" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} />
          <Input placeholder="Resume URL (optional)" value={resumeUrl} onChange={(e) => setResumeUrl(e.target.value)} />
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
