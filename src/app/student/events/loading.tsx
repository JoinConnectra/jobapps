export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="h-8 w-40 animate-pulse rounded bg-muted" />
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-40 rounded-lg border bg-card" />
        ))}
      </div>
    </div>
  );
}
