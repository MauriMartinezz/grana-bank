import { Skeleton } from "@/components/ui/skeleton";

export default function MovementDetailLoading() {
  return (
    <div role="status" aria-label="Cargando movimiento">
      <Skeleton className="mt-2 mb-2 h-7 w-32" />
      <div className="mt-5 rounded-2xl bg-surface p-6">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="size-14 rounded-2xl" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="mt-6 space-y-5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  );
}
