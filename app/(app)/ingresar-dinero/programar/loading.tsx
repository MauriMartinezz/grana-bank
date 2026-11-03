import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-6 h-40 w-full rounded-2xl" />
      <Skeleton className="mt-6 h-11 w-full" />
    </>
  );
}
