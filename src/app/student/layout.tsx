import type { ReactNode } from "react";
import StudentSidebar from "@/components/student/StudentSidebar";
import StudentTopbar from "@/components/student/StudentTopbar";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-[260px_1fr]">
      <aside className="border-r"><StudentSidebar /></aside>
      <section className="flex flex-col">
        <StudentTopbar />
        <main className="p-6">{children}</main>
      </section>
    </div>
  );
}
