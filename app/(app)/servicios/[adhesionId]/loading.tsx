import { Skeleton } from "@/components/ui/skeleton";

export default function AdhesionLoading() {
  return (
    <div role="status" aria-label="Cargando facturas">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-5 h-[76px] rounded-2xl" />
      <Skeleton className="mt-6 h-6 w-24" />
      <div className="mt-3 space-y-3">
        {Array.from({ length: 2 }, (_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
