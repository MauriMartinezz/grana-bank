import type { Metadata } from "next";
import { BackButton } from "@/components/ui/back-button";
import { lookupRecipient } from "@/features/transfers/actions";
import { FieldForm } from "@/features/transfers/field-form";

export const metadata: Metadata = { title: "Nuevo destinatario" };

export default function NewRecipientPage() {
  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/transfers" />
        <h1 className="font-serif text-2xl font-bold">Nuevo destinatario</h1>
      </header>
      <p className="mt-2 text-sm text-muted">
        Ingresá el email de la persona. Después de transferirle, la vas a ver en
        tus contactos.
      </p>

      <div className="mt-6">
        <FieldForm
          action={lookupRecipient}
          label="Email del destinatario"
          name="email"
          submitLabel="Continuar"
          pendingLabel="Buscando…"
          input={{
            type: "email",
            inputMode: "email",
            autoComplete: "off",
            placeholder: "persona@email.com",
          }}
        />
      </div>
    </>
  );
}
