import type { Metadata } from "next";
import { BackButton } from "@/components/ui/back-button";
import { SubeCardForm } from "@/features/top-ups/sube-card-form";

export const metadata: Metadata = { title: "Agregar tarjeta SUBE" };

export default function NewSubeCardPage() {
  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/recargas/sube" />
        <h1 className="font-serif text-2xl font-bold">Agregar tarjeta SUBE</h1>
      </header>
      <p className="mt-2 mb-6 text-sm text-muted">
        Podés guardar varias tarjetas: ponele a cada una un nombre para reconocerla.
      </p>
      <SubeCardForm />
    </>
  );
}
