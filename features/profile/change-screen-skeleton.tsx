import { Skeleton } from "@/components/ui/skeleton";

/** The loading state of a Perfil change screen: header, fields and the button. */
export function ChangeScreenSkeleton({ fields }: { fields: number }) {
  return (
    <div role="status" aria-label="Cargando formulario">
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: fields }, (_, i) => (
        <div key={i}>
          <Skeleton className="mt-6 h-4 w-32" />
          <Skeleton className="mt-2 h-11 rounded-xl" />
        </div>
      ))}
      <Skeleton className="mt-6 h-12 rounded-full" />
    </div>
  );
}
