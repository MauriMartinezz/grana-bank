import { Skeleton } from "@/components/ui/skeleton";

export default function ExchangeLoading() {
  return (
    <div role="status" aria-label="Cargando cotización">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="mt-5 h-[168px] rounded-2xl" />
      <Skeleton className="mt-6 h-12 rounded-full" />
      <Skeleton className="mt-5 h-11 rounded-xl" />
      <Skeleton className="mt-5 h-11 rounded-xl" />
      <Skeleton className="mt-5 h-11 rounded-xl" />
      <Skeleton className="mt-8 h-12 rounded-full" />
    </div>
  );
}
