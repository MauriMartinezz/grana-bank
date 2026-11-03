import { TopUpFormSkeleton } from "@/features/top-ups/form-skeleton";

export default function PayBillLoading() {
  return <TopUpFormSkeleton label="Cargando factura" fields={1} />;
}
