import type { Metadata } from "next";
import Link from "next/link";
import { BackButton } from "@/components/ui/back-button";
import { COMPANY_INFO, companySlug, SERVICE_COMPANIES } from "@/features/services/companies";

export const metadata: Metadata = { title: "Adherir servicio" };

export default function AdhereServicePage() {
  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/servicios" />
        <h1 className="font-serif text-2xl font-bold">Adherir servicio</h1>
      </header>
      <p className="mt-2 mb-6 text-sm text-muted">Elegí la empresa del servicio que querés adherir.</p>

      <ul aria-label="Empresas" className="space-y-3">
        {SERVICE_COMPANIES.map((company) => {
          const { name, service, currency } = COMPANY_INFO[company];
          return (
            <li key={company}>
              <Link
                href={`/servicios/adherir/${companySlug(company)}`}
                className="flex min-h-16 items-center justify-between gap-3 rounded-2xl bg-surface p-4 transition-colors hover:bg-surface/70 active:bg-surface/60"
              >
                <span>
                  <span className="block font-medium">{name}</span>
                  <span className="block text-sm text-muted">
                    {service}
                    {currency === "USD" && " · en dólares"}
                  </span>
                </span>
                <span aria-hidden="true" className="text-xl text-muted">
                  ›
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
