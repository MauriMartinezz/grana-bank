import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BackButton } from "@/components/ui/back-button";
import { Skeleton } from "@/components/ui/skeleton";
import { lookupRecipient } from "@/features/transfers/actions";
import { FieldForm } from "@/features/transfers/field-form";

export const metadata: Metadata = { title: "Nuevo destinatario" };

const METHODS = {
  alias: {
    label: "Alias del destinatario",
    hint: "Ingresá el alias de la cuenta. No importan las mayúsculas.",
    switchTo: { href: "/transferir/nuevo?by=email", label: "Transferir por email" },
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
    switchTo: { href: "/transferir/nuevo", label: "Transferir por alias" },
    input: {
      type: "email",
      inputMode: "email",
      autoComplete: "off",
      placeholder: "persona@email.com",
    },
  },
} as const;

// Reads the URL, so it renders behind Suspense: the shell shared by every
// link to this route cannot depend on `?by=`.
async function RecipientForm({
  searchParams,
}: {
  searchParams: PageProps<"/transferir/nuevo">["searchParams"];
}) {
  const { by: requested } = await searchParams;
  const by = requested === "email" ? "email" : "alias";
  const method = METHODS[by];

  return (
    <>
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

function RecipientFormSkeleton() {
  return (
    <div role="status" aria-label="Cargando formulario">
      <Skeleton className="mt-2 h-4 w-64" />
      <Skeleton className="mt-6 h-4 w-40" />
      <Skeleton className="mt-2 h-11 rounded-xl" />
      <Skeleton className="mt-8 h-12 rounded-full" />
    </div>
  );
}

export default function NewRecipientPage({ searchParams }: PageProps<"/transferir/nuevo">) {
  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/transferir" />
        <h1 className="font-serif text-2xl font-bold">Nuevo destinatario</h1>
      </header>
      <Suspense fallback={<RecipientFormSkeleton />}>
        <RecipientForm searchParams={searchParams} />
      </Suspense>
    </>
  );
}
