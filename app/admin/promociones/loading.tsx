import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-6 h-11 w-full rounded-xl" />
      <Skeleton className="mt-4 h-11 w-full rounded-xl" />
      <Skeleton className="mt-4 h-11 w-full rounded-xl" />
      <Skeleton className="mt-8 h-28 w-full rounded-2xl" />
    </>
  );
}
