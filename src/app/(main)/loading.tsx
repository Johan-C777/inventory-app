import { PanelSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-3 h-4 w-96 max-w-full" />
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <PanelSkeleton className="lg:col-span-2" rows={6} />
        <PanelSkeleton rows={6} />
      </div>
    </div>
  );
}
