import type { ReactNode } from "react";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import StudentSidebar from "@/components/student/StudentSidebar";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <ConsoleShell sidebar={<StudentSidebar />}>
      {children}
    </ConsoleShell>
  );
}
