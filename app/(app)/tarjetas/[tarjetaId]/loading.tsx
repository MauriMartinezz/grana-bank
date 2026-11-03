import { Skeleton } from "@/components/ui/skeleton";
import { MovementListSkeleton } from "@/features/movements/movement-list-skeleton";

export default function CardDetailLoading() {
  return (
    <div role="status" aria-label="Cargando tarjeta">
      <Skeleton className="mt-2 mb-2 h-7 w-32" />
      <Skeleton className="mt-5 h-44 rounded-[28px]" />
      <div className="mt-5 space-y-5 rounded-2xl bg-surface p-5">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
      <Skeleton className="mt-8 mb-3 h-6 w-56" />
      <MovementListSkeleton rows={3} />
    </div>
  );
}
