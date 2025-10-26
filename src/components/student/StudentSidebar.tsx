export default function StudentSidebar(){
  return (
    <nav className="p-4 space-y-1 text-sm">
      <a href="/student/dashboard" className="block rounded px-3 py-2 hover:bg-muted/50">Dashboard</a>
      <a href="/student/jobs" className="block rounded px-3 py-2 hover:bg-muted/50">Jobs</a>
      <a href="/student/applications" className="block rounded px-3 py-2 hover:bg-muted/50">Applications</a>
      <a href="/student/profile" className="block rounded px-3 py-2 hover:bg-muted/50">Profile</a>
      <a href="/student/settings" className="block rounded px-3 py-2 hover:bg-muted/50">Settings</a>
    </nav>
  );
}
