import { Skeleton } from "@/components/ui/skeleton";
import { SelectedAccountSkeleton } from "./selected-account-skeleton";

export default function HomeLoading() {
  return (
    <>
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-10" />
        <Skeleton className="h-7 w-28" />
      </div>
      <SelectedAccountSkeleton />
    </>
  );
}
