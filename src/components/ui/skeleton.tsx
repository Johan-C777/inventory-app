import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

export function PanelSkeleton({ className, rows = 4 }: { className?: string; rows?: number }) {
  return (
    <div className={cn("hud hud-quiet p-5", className)}>
      <Skeleton className="h-4 w-40" />
      <div className="mt-5 space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-9" />
        ))}
      </div>
    </div>
  );
}
