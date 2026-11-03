import { Skeleton } from "@/components/ui/skeleton";

export default function ConfirmTopUpLoading() {
  return (
    <div role="status" aria-label="Cargando recarga">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="mt-5 h-[300px] rounded-2xl" />
      <Skeleton className="mt-8 h-12 rounded-full" />
    </div>
  );
}
