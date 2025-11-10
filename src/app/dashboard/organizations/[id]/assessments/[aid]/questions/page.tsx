// src/app/dashboard/organizations/[id]/assessments/[aid]/questions/page.tsx
"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function QuestionsRedirectPage() {
  const router = useRouter();
  const params = useParams<{ id: string; aid: string }>();

  useEffect(() => {
    const orgId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    const aid = Array.isArray(params?.aid) ? params.aid[0] : params?.aid;
    if (orgId && aid) {
      router.replace(`/dashboard/organizations/${orgId}/assessments/${aid}/edit?tab=questions`);
    } else {
      router.replace("/dashboard");
    }
  }, [params, router]);

  return null;
}
