import { TopUpFormSkeleton } from "@/features/top-ups/form-skeleton";

export default function PhoneTopUpLoading() {
  return <TopUpFormSkeleton label="Cargando recarga" fields={4} />;
}
