// src/components/student/EmptyState.tsx
export default function EmptyState({
  title,
  hint,
  cta,
}: {
  title: string;
  hint?: string;
  cta?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-8 text-center">
      <div className="text-lg font-medium">{title}</div>
      {hint ? <div className="mt-1 text-sm text-muted-foreground">{hint}</div> : null}
      {cta ? <div className="mt-4">{cta}</div> : null}
    </div>
  );
}
