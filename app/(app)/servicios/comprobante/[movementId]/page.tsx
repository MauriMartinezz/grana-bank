import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckIcon } from "@/components/icons";
import { buttonClassName } from "@/components/ui/button";
import { getCurrentUser } from "@/features/auth/current-user";
import { COMPANY_INFO } from "@/features/services/companies";
import { getServiceReceipt } from "@/features/services/queries";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Pago realizado" };

export default async function BillPaymentSuccessPage({
  params,
}: PageProps<"/servicios/comprobante/[movementId]">) {
  const { movementId } = await params;
  const user = await getCurrentUser();
  const movement = await getServiceReceipt(user.id, movementId);
  const bill = movement?.servicePayment?.bill;
  if (!movement || !bill) notFound();
  const { adhesion } = bill;

  return (
    <section className="flex flex-col items-center pt-10 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-garnet-fill text-white">
        <CheckIcon className="size-8" />
      </span>
      <h1 className="mt-5 font-serif text-2xl font-bold">¡Pago realizado!</h1>
      <p className="mt-2 text-3xl font-semibold">
        {formatMoney(movement.amountCents, movement.account.currency)}
      </p>
      <p className="mt-1 text-sm text-muted">
        {COMPANY_INFO[adhesion.company].name} · {adhesion.nickname} · {bill.period}
      </p>
      <p className="mt-4 text-sm text-muted">N.º de operación {movement.reference}</p>

      <div className="mt-10 w-full space-y-3">
        <Link href={`/movimientos/${movement.id}`} className={`${buttonClassName} w-full`}>
          Ver comprobante
        </Link>
        <Link
          href={`/servicios/${adhesion.id}`}
          className="flex min-h-12 items-center justify-center font-serif text-sm text-garnet"
        >
          Volver al servicio
        </Link>
      </div>
    </section>
  );
}
