import { TopUpFormSkeleton } from "@/features/top-ups/form-skeleton";

export default function NewSubeCardLoading() {
  return <TopUpFormSkeleton label="Cargando formulario" fields={2} />;
}
