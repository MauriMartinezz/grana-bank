import type { Metadata } from "next";
import Link from "next/link";
import { BackButton } from "@/components/ui/back-button";
import { PROVIDER_NAMES, PROVIDERS_BY_KIND } from "@/features/top-ups/validation";

export const metadata: Metadata = { title: "Recargar celular" };

export default function PhoneTopUpPage() {
  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/recargas" />
        <h1 className="font-serif text-2xl font-bold">Recargar celular</h1>
      </header>
      <p className="mt-2 mb-6 text-sm text-muted">
        Elegí la compañía y cargá saldo a cualquier número de Argentina.
      </p>

      <ul aria-label="Compañías" className="space-y-3">
        {PROVIDERS_BY_KIND.PHONE.map((provider) => (
          <li key={provider}>
            <Link
              href={`/recargas/celular/${provider.toLowerCase()}`}
              className="flex min-h-14 items-center justify-between gap-3 rounded-2xl bg-surface p-4 font-medium transition-colors hover:bg-surface/70 active:bg-surface/60"
            >
              {PROVIDER_NAMES[provider]}
              <span aria-hidden="true" className="text-xl text-muted">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
