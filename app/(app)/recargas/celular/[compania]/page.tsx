import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { getCurrentUser } from "@/features/auth/current-user";
import { TopUpPayment } from "@/features/top-ups/top-up-payment";
import { PROVIDER_NAMES, phoneProviderFromSlug } from "@/features/top-ups/validation";

export const metadata: Metadata = { title: "Recargar celular" };

export default async function PhoneCompanyTopUpPage({
  params,
}: PageProps<"/recargas/celular/[compania]">) {
  const { compania } = await params;
  const provider = phoneProviderFromSlug(compania);
  if (!provider) notFound();
  const user = await getCurrentUser();

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/recargas/celular" />
        <h1 className="font-serif text-2xl font-bold">Recargar {PROVIDER_NAMES[provider]}</h1>
      </header>
      <p className="mt-2 mb-6 text-sm text-muted">
        Cargá saldo a cualquier número {PROVIDER_NAMES[provider]} de Argentina.
      </p>
      <TopUpPayment userId={user.id} kind="PHONE" provider={provider} />
    </>
  );
}
