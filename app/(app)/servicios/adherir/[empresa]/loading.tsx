import { TopUpFormSkeleton } from "@/features/top-ups/form-skeleton";

export default function AdhereServiceLoading() {
  return <TopUpFormSkeleton label="Cargando formulario" fields={3} />;
}
