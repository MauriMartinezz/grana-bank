import { Skeleton } from "@/components/ui/skeleton";

export default function SubscriptionLoading() {
  return (
    <div role="status" aria-label="Cargando suscripción">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-5 h-[140px] rounded-2xl" />
      <Skeleton className="mt-4 h-[120px] rounded-2xl" />
      <Skeleton className="mt-6 h-6 w-40" />
      <div className="mt-3 space-y-3">
        {Array.from({ length: 2 }, (_, i) => (
          <Skeleton key={i} className="h-[52px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
