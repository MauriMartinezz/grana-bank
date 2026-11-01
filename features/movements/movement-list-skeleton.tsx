import { Skeleton } from "@/components/ui/skeleton";

export function MovementListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      role="status"
      aria-label="Cargando movimientos"
      className="flex flex-col gap-3"
    >
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 rounded-2xl bg-white p-4"
        >
          <Skeleton className="size-11 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
          <Skeleton className="h-3.5 w-10" />
        </div>
      ))}
    </div>
  );
}
