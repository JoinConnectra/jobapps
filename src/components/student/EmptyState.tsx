export default function EmptyState({ title, subtitle, cta }:{ title:string; subtitle?:string; cta?:JSX.Element }){
  return (
    <div className="rounded-lg border p-8 text-center">
      <div className="text-lg font-medium">{title}</div>
      {subtitle && <div className="text-sm text-muted-foreground mt-1">{subtitle}</div>}
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
