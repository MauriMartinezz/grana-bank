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
      <Skeleton className="mt-6 mb-4 h-6 w-48" />
      <MovementListSkeleton />
    </>
  );
}
