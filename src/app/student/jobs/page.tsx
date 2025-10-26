// src/app/jobs/page.tsx
import { absoluteUrl } from "@/lib/url";
import JobBrowser from "./JobBrowser";

async function getJobs() {
  const url = await absoluteUrl("/api/jobs");
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export default async function JobsPage() {
  const jobs = await getJobs();

  return (
    // Ensure we use the full viewport width/height. Avoid wrapping this in a narrow container elsewhere.
    <div className="w-screen h-[100dvh] overflow-hidden">
      <JobBrowser initialJobs={jobs} />
    </div>
  );
}
