import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/ui/back-button";
import { getCurrentUser } from "@/features/auth/current-user";
import { MOVEMENT_TYPE_STYLES } from "@/features/movements/movement-type";
import { getMovement } from "@/features/movements/queries";
import { formatDateTime, formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Detalle del movimiento" };

export default async function MovementDetailPage({
  params,
}: PageProps<"/movements/[id]">) {
  const { id } = await params;
  const user = await getCurrentUser();
  const movement = await getMovement(user.id, id);

  if (!movement) {
    notFound();
  }

  const { label, Icon, tileClass, amountClass } =
    MOVEMENT_TYPE_STYLES[movement.type];

  return (
    <>
      <header className="flex items-center gap-1">
        <BackButton fallbackHref="/movements" />
        <h1 className="font-serif text-2xl font-bold">Detalle</h1>
      </header>

      <section className="mt-5 rounded-2xl bg-white p-6">
        <div className="flex flex-col items-center text-center">
          <span
            className={`flex size-14 items-center justify-center rounded-2xl ${tileClass}`}
          >
            <Icon />
          </span>
          <p className="mt-4 font-medium">{movement.counterparty}</p>
          <p className={`mt-1 text-3xl font-semibold ${amountClass}`}>
            {formatMoney(movement.amountCents, movement.account.currency)}
          </p>
        </div>

        <dl className="mt-6 divide-y divide-line text-sm">
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">Tipo</dt>
            <dd className="text-right font-medium">{label}</dd>
          </div>
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">Fecha</dt>
            <dd className="text-right font-medium">
              {formatDateTime(movement.occurredAt)}
            </dd>
          </div>
          <div className="flex justify-between gap-6 py-3">
            <dt className="text-muted">N.º de operación</dt>
            <dd className="text-right font-medium">{movement.reference}</dd>
          </div>
        </dl>
      </section>
    </>
  );
}
