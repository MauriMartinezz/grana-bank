import type { Metadata } from "next";
import { BackButton } from "@/components/ui/back-button";
import { getCurrentUser } from "@/features/auth/current-user";
import { TopUpPayment } from "@/features/top-ups/top-up-payment";

export const metadata: Metadata = { title: "Recargar celular" };

export default async function PhoneTopUpPage() {
  const user = await getCurrentUser();

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/recargas" />
        <h1 className="font-serif text-2xl font-bold">Recargar celular</h1>
      </header>
      <p className="mt-2 mb-6 text-sm text-muted">
        Elegí la compañía y cargá saldo a cualquier número de Argentina.
      </p>
      <TopUpPayment userId={user.id} kind="PHONE" />
    </>
  );
}
