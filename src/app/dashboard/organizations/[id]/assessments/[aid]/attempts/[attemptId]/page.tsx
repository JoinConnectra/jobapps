"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function AttemptReview() {
  const params = useParams<{ attemptId: string; id: string; aid: string }>();
  const attemptId = Number(params.attemptId);

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("bearer_token");
    fetch(`/api/assessments/${params.aid}/attempts/${attemptId}/review`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((json) => {
        setItems(json || []);
        setLoading(false);
      });
  }, [attemptId, params.aid]);

  if (loading) return "Loading...";

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold mb-6">Attempt Review</h2>

      {items.map((i, idx) => (
        <div key={idx} className="border rounded p-3 mb-4 bg-white">
          <div className="font-medium">{i.question}</div>
          <div className="text-sm text-gray-600 mt-1">Answer: {JSON.stringify(i.response)}</div>
          {i.correctAnswer && (
            <div className="text-sm text-gray-600">Correct: {i.correctAnswer}</div>
          )}
          <div className="text-sm font-semibold mt-1">
            Score: {i.autoScore ?? "-"}
          </div>
        </div>
      ))}
    </div>
  );
}
