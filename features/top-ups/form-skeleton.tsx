import { Skeleton } from "@/components/ui/skeleton";

/** Loading state of the top-up and SUBE card forms. */
export function TopUpFormSkeleton({ label, fields }: { label: string; fields: number }) {
  return (
    <div role="status" aria-label={label}>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-5 h-4 w-48" />
      {Array.from({ length: fields }, (_, i) => (
        <div key={i}>
          <Skeleton className="mt-5 h-4 w-32" />
          <Skeleton className="mt-2 h-11 rounded-xl" />
        </div>
      ))}
      <Skeleton className="mt-8 h-12 rounded-full" />
    </div>
  );
}
