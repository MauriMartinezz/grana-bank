import { Skeleton } from "@/components/ui/skeleton";
import { MovementListSkeleton } from "@/features/movements/movement-list-skeleton";

export default function HomeLoading() {
  return (
    <>
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-10" />
        <Skeleton className="h-7 w-28" />
      </div>
      <Skeleton className="mt-4 h-[190px] rounded-[28px]" />
      <div className="mt-4 grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[84px] rounded-2xl" />
        ))}
      </div>
      <Skeleton className="mt-6 mb-4 h-6 w-48" />
      <MovementListSkeleton />
    </>
  );
}
