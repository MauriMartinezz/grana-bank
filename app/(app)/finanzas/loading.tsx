import { Skeleton } from "@/components/ui/skeleton";

// Mirrors the page: title, account switcher, month, summary and categories.
export default function Loading() {
  return (
    <div role="status" aria-label="Cargando finanzas personales">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-3 h-4 w-3/4" />
      <Skeleton className="mt-4 h-[52px] w-full rounded-full" />
      <Skeleton className="mt-4 h-11 w-full" />
      <Skeleton className="mt-4 h-28 w-full rounded-2xl" />
      <Skeleton className="mt-6 mb-3 h-6 w-40" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
