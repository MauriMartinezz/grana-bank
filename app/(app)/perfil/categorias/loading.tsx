import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-6 h-11 w-full" />
      <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
    </>
  );
}
