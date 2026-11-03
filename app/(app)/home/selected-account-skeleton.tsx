import { Skeleton } from "@/components/ui/skeleton";
import { MovementListSkeleton } from "@/features/movements/movement-list-skeleton";

/** Stands in for the switcher, balance card, quick actions and movements. */
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
      <Skeleton className="mt-6 mb-4 h-6 w-48" />
      <MovementListSkeleton />
    </div>
  );
}
