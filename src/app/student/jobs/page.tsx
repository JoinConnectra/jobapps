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
    // Full-viewport height, NEVER allow horizontal scrolling from this page
    <div className="h-[100dvh] max-w-full overflow-hidden overflow-x-clip">
      <JobBrowser initialJobs={jobs} />
    </div>
  );
}
