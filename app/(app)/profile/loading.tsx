import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div role="status" aria-label="Cargando perfil">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="size-20 rounded-full" />
        <Skeleton className="h-7 w-40" />
      </div>
      <Skeleton className="mt-6 h-[420px] rounded-2xl" />
    </div>
  );
}
