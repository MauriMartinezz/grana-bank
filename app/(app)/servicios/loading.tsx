import { Skeleton } from "@/components/ui/skeleton";

export default function ServicesLoading() {
  return (
    <div role="status" aria-label="Cargando servicios">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-5 h-12 rounded-full" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 2 }, (_, i) => (
          <Skeleton key={i} className="h-[72px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
