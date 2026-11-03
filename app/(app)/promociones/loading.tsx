import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-5 h-11 w-full rounded-full" />
      <Skeleton className="mt-6 h-28 w-full rounded-2xl" />
      <Skeleton className="mt-3 h-28 w-full rounded-2xl" />
    </>
  );
}
