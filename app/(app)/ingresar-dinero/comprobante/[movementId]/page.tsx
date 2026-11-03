import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckIcon } from "@/components/icons";
import { buttonClassName } from "@/components/ui/button";
import { getCurrentUser } from "@/features/auth/current-user";
import { getMovement } from "@/features/movements/queries";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Dinero ingresado" };

export default async function DepositReceiptPage({
  params,
}: PageProps<"/ingresar-dinero/comprobante/[movementId]">) {
  const { movementId } = await params;
  const user = await getCurrentUser();
  const movement = await getMovement(user.id, movementId);
  // Only the user's received side of a transfer has this screen.
  if (!movement || movement.type !== "RECEIVED" || !movement.transferId) notFound();

  return (
    <section className="flex flex-col items-center pt-10 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-garnet-fill text-white">
        <CheckIcon className="size-8" />
      </span>
      <h1 className="mt-5 font-serif text-2xl font-bold">¡Dinero ingresado!</h1>
      <p className="mt-2 text-3xl font-semibold">
        {formatMoney(movement.amountCents, movement.account.currency)}
      </p>
      <p className="mt-1 text-sm text-muted">de {movement.counterparty}</p>
      <p className="mt-4 text-sm text-muted">N.º de operación {movement.reference}</p>

      <div className="mt-10 w-full space-y-3">
        <Link href={`/movimientos/${movement.id}`} className={`${buttonClassName} w-full`}>
          Ver comprobante
        </Link>
        <Link
          href="/inicio"
          className="flex min-h-12 items-center justify-center font-serif text-sm text-garnet"
        >
          Volver al inicio
        </Link>
      </div>
    </section>
  );
}
