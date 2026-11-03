import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Pago de servicios" };

export default function ServicesPage() {
  return (
    <ComingSoon
      title="Servicios"
      description="Muy pronto vas a poder pagar tus servicios desde acá."
    />
  );
}
