import { Skeleton } from "@/components/ui/skeleton";

/** Stands in for the switcher, balance card and quick actions. */
export function SelectedAccountSkeleton() {
  return (
    <div role="status" aria-label="Cargando cuenta">
      <Skeleton className="mt-4 h-[52px] rounded-full" />
      <Skeleton className="mt-4 h-[210px] rounded-[28px]" />
      <div className="mt-4 grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[84px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
