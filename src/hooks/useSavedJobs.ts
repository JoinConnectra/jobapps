export async function getSavedJobs(){
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/student/saved-jobs`,{ cache:"no-store" });
  return res.ok ? res.json() : [];
}
export async function saveJob(jobId:string){
  await fetch(`/api/student/saved-jobs`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ jobId }) });
}
export async function unsaveJob(jobId:string){
  await fetch(`/api/student/saved-jobs?jobId=${encodeURIComponent(jobId)}`, { method:"DELETE" });
}
