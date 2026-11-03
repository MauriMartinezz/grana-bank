import type { Metadata } from "next";
import { BackButton } from "@/components/ui/back-button";
import { getCurrentUser } from "@/features/auth/current-user";
import { TopUpPayment } from "@/features/top-ups/top-up-payment";

export const metadata: Metadata = { title: "Recargar DirecTV" };

export default async function DirectvTopUpPage() {
  const user = await getCurrentUser();

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/recargas" />
        <h1 className="font-serif text-2xl font-bold">Recargar DirecTV</h1>
      </header>
      <p className="mt-2 mb-6 text-sm text-muted">Cargá saldo a tu cuenta prepaga de DirecTV.</p>
      <TopUpPayment userId={user.id} kind="DIRECTV" />
    </>
  );
}
