import { Skeleton } from "@/components/ui/skeleton";

export default function TransferSuccessLoading() {
  return (
    <div role="status" aria-label="Cargando comprobante" className="flex flex-col items-center pt-10">
      <Skeleton className="size-16 rounded-full" />
      <Skeleton className="mt-5 h-7 w-56" />
      <Skeleton className="mt-3 h-9 w-32" />
      <Skeleton className="mt-4 h-4 w-40" />
      <Skeleton className="mt-10 h-12 w-full rounded-full" />
    </div>
  );
}
