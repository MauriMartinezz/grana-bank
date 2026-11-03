import { TopUpFormSkeleton } from "@/features/top-ups/form-skeleton";

export default function DirectvTopUpLoading() {
  return <TopUpFormSkeleton label="Cargando recarga" fields={3} />;
}
