import { Skeleton } from "@/components/ui/skeleton";

export default function CardsLoading() {
  return (
    <div role="status" aria-label="Cargando tarjetas">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-5 h-12 rounded-full" />
      <Skeleton className="mt-6 mb-2 h-4 w-32" />
      <div className="space-y-px overflow-hidden rounded-2xl">
        {Array.from({ length: 2 }, (_, i) => (
          <Skeleton key={i} className="h-[76px] rounded-none" />
        ))}
      </div>
    </div>
  );
}
