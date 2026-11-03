import type { Metadata } from "next";
import { BackButton } from "@/components/ui/back-button";
import { AdhesionForm } from "@/features/services/adhesion-form";

export const metadata: Metadata = { title: "Adherir servicio" };

export default function AdhereServicePage() {
  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/servicios" />
        <h1 className="font-serif text-2xl font-bold">Adherir servicio</h1>
      </header>
      <p className="mt-2 mb-6 text-sm text-muted">
        Buscá el número de pago electrónico en tu factura y ponele un nombre para reconocerlo.
      </p>
      <AdhesionForm />
    </>
  );
}
