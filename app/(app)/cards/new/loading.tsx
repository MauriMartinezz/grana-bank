import { Skeleton } from "@/components/ui/skeleton";

export default function NewCardLoading() {
  return (
    <div role="status" aria-label="Cargando formulario">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-64" />
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i}>
          <Skeleton className="mt-6 h-4 w-40" />
          <Skeleton className="mt-2 h-11 rounded-xl" />
        </div>
      ))}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <Skeleton className="h-11 rounded-xl" />
        <Skeleton className="h-11 rounded-xl" />
      </div>
      <Skeleton className="mt-6 h-11 rounded-xl" />
      <Skeleton className="mt-8 h-12 rounded-full" />
    </div>
  );
}
