import { Skeleton } from "@/components/ui/skeleton";

export default function TransferStepLoading() {
  return (
    <div role="status" aria-label="Cargando transferencia">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-5 h-[92px] rounded-2xl" />
      <Skeleton className="mt-6 h-4 w-32" />
      <Skeleton className="mt-3 h-11 rounded-xl" />
      <Skeleton className="mt-8 h-12 rounded-full" />
    </div>
  );
}
