import type { Metadata } from "next";
import Link from "next/link";
import { BackButton } from "@/components/ui/back-button";
import { lookupRecipient } from "@/features/transfers/actions";
import { FieldForm } from "@/features/transfers/field-form";

export const metadata: Metadata = { title: "Nuevo destinatario" };

const METHODS = {
  alias: {
    label: "Alias del destinatario",
    hint: "Ingresá el alias de la cuenta. No importan las mayúsculas.",
    switchTo: { href: "/transfers/new?by=email", label: "Transferir por email" },
    input: {
      autoCapitalize: "none",
      autoCorrect: "off",
      spellCheck: false,
      autoComplete: "off",
      placeholder: "nombre.apellido",
    },
  },
  email: {
    label: "Email del destinatario",
    hint: "Ingresá el email de la persona.",
    switchTo: { href: "/transfers/new", label: "Transferir por alias" },
    input: {
      type: "email",
      inputMode: "email",
      autoComplete: "off",
      placeholder: "persona@email.com",
    },
  },
} as const;

export default async function NewRecipientPage({
  searchParams,
}: PageProps<"/transfers/new">) {
  const { by: requested } = await searchParams;
  const by = requested === "email" ? "email" : "alias";
  const method = METHODS[by];

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/transfers" />
        <h1 className="font-serif text-2xl font-bold">Nuevo destinatario</h1>
      </header>
      <p className="mt-2 text-sm text-muted">
        {method.hint} Después de transferirle, la vas a ver en tus contactos.
      </p>

      <div className="mt-6">
        <FieldForm
          // A new form per method, so the typed value and error do not carry over.
          key={by}
          action={lookupRecipient}
          label={method.label}
          name={by}
          hidden={{ by }}
          submitLabel="Continuar"
          pendingLabel="Buscando…"
          input={method.input}
        />
      </div>

      <Link
        href={method.switchTo.href}
        replace
        className="mt-3 flex min-h-12 items-center justify-center font-serif text-sm text-garnet"
      >
        {method.switchTo.label}
      </Link>
    </>
  );
}
