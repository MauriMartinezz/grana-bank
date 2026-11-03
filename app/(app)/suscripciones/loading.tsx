import { Skeleton } from "@/components/ui/skeleton";

export default function SubscriptionsLoading() {
  return (
    <div role="status" aria-label="Cargando suscripciones">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-5 h-12 rounded-full" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
