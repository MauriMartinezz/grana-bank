import { Skeleton } from "@/components/ui/skeleton";

export default function TopUpsLoading() {
  return (
    <div role="status" aria-label="Cargando recargas">
      <Skeleton className="h-8 w-40" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
