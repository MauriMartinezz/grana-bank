import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { AdhesionForm } from "@/features/services/adhesion-form";
import { COMPANY_INFO, companyFromSlug } from "@/features/services/companies";

export const metadata: Metadata = { title: "Adherir servicio" };

export default async function AdhereCompanyPage({
  params,
}: PageProps<"/servicios/adherir/[empresa]">) {
  const { empresa } = await params;
  const company = companyFromSlug(empresa);
  if (!company) notFound();
  const { name, service, currency } = COMPANY_INFO[company];

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/servicios/adherir" />
        <h1 className="font-serif text-2xl font-bold">Adherir {name}</h1>
      </header>
      <p className="mt-2 mb-6 text-sm text-muted">
        {service}
        {currency === "USD" && ", se paga en dólares"}. Buscá el número de pago electrónico en tu
        factura y ponele un nombre para reconocerlo.
      </p>
      <AdhesionForm company={company} />
    </>
  );
}
