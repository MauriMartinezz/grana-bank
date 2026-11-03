import { Skeleton } from "@/components/ui/skeleton";

export default function NewSubscriptionLoading() {
  return (
    <div role="status" aria-label="Cargando catálogo">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-2 h-4 w-full" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[92px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
