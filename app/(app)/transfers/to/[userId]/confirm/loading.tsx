import { Skeleton } from "@/components/ui/skeleton";

export default function ConfirmTransferLoading() {
  return (
    <div role="status" aria-label="Cargando confirmación">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-5 h-[112px] rounded-2xl" />
      <Skeleton className="mt-4 h-[220px] rounded-2xl" />
      <Skeleton className="mt-8 h-12 rounded-full" />
    </div>
  );
}
