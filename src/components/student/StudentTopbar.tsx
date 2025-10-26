export default function StudentTopbar(){
  return (
    <div className="border-b p-4 flex items-center justify-between">
      <div className="text-sm text-muted-foreground">Student Portal</div>
      <div className="flex items-center gap-2">
        <input placeholder="Search jobs" className="border rounded px-3 py-2 text-sm" />
      </div>
    </div>
  );
}
