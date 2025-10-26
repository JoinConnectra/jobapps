export default function JobCard({ job }:{ job:any }){
  return (
    <a href={`/student/jobs/${job.id}`} className="rounded-lg border p-4 hover:bg-muted/30">
      <div className="font-medium">{job.title}</div>
      <div className="text-sm text-muted-foreground">{job.organization?.name} • {job.location}</div>
    </a>
  );
}
