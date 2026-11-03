import { Skeleton } from "@/components/ui/skeleton";

export default function SubeCardsLoading() {
  return (
    <div role="status" aria-label="Cargando tarjetas SUBE">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-5 h-12 rounded-full" />
      <div className="mt-6 space-y-px">
        {Array.from({ length: 2 }, (_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
