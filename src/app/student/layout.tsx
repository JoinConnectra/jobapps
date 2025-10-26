import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ConsoleShell } from "@/components/console/ConsoleShell";
import StudentSidebar from "@/components/student/StudentSidebar";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  // 1) Require session
  const session = await auth.api.getSession({ headers: await headers() });
  const email = session?.user?.email;
  if (!email) {
    redirect("/login?next=/student");
  }

  // 2) Check app user & role
  const appUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (appUser.length === 0) {
    redirect("/login?next=/student");
  }
  const accountType = appUser[0].accountType;
  if (accountType !== "applicant") {
    redirect("/dashboard");
  }

  return (
    <ConsoleShell sidebar={<StudentSidebar />}>
      {children}
    </ConsoleShell>
  );
}
