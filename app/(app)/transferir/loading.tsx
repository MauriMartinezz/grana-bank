import { Skeleton } from "@/components/ui/skeleton";

export default function TransfersLoading() {
  return (
    <div role="status" aria-label="Cargando contactos">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-5 h-[76px] rounded-2xl" />
      <Skeleton className="mt-6 mb-2 h-4 w-20" />
      <div className="space-y-px overflow-hidden rounded-2xl">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[76px] rounded-none" />
        ))}
      </div>
    </div>
  );
}
