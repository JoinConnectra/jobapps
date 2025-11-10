"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function AssessmentStart() {
  const params = useParams<{ aid: string }>();
  const router = useRouter();

  const aid = Number(params?.aid);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const startAttempt = async () => {
    setLoading(true);
    setError("");

    const token = localStorage.getItem("bearer_token");
    const resp = await fetch(`/api/assessments/${aid}/attempts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
    });

    const json = await resp.json();

    if (!resp.ok) {
      setLoading(false);
      setError(json.error || "Something went wrong");
      return;
    }

    router.push(`/student/assessments/${aid}/attempt/${json.attemptId}`);
  };

  return (
    <div className="p-8 max-w-xl mx-auto">
      <h1 className="text-xl font-semibold mb-4">Start Assessment</h1>

      {error && <div className="text-red-600 text-sm mb-4">{error}</div>}

      <Button onClick={startAttempt} disabled={loading}>
        {loading ? "Starting..." : "Start Now"}
      </Button>
    </div>
  );
}
