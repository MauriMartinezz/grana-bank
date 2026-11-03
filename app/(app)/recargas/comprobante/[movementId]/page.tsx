import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckIcon } from "@/components/icons";
import { buttonClassName } from "@/components/ui/button";
import { getCurrentUser } from "@/features/auth/current-user";
import { getTopUpReceipt } from "@/features/top-ups/queries";
import { SubeNotice } from "@/features/top-ups/sube-notice";
import { resolveTarget } from "@/features/top-ups/top-up";
import { PROVIDER_NAMES } from "@/features/top-ups/validation";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Recarga realizada" };

export default async function TopUpSuccessPage({
  params,
}: PageProps<"/recargas/comprobante/[movementId]">) {
  const { movementId } = await params;
  const user = await getCurrentUser();
  const movement = await getTopUpReceipt(user.id, movementId);
  const topUp = movement?.topUp;
  if (!movement || !topUp) notFound();

  // The stored target is already normalized, so it resolves to the same
  // label as when it was paid; a removed SUBE card falls back to the movement.
  const resolved = await resolveTarget(db, user.id, topUp.kind, topUp.provider, topUp.target);
  const detail = resolved.ok
    ? `${PROVIDER_NAMES[topUp.provider]} · ${resolved.label}`
    : movement.counterparty;

  return (
    <section className="flex flex-col items-center pt-10 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-garnet-fill text-white">
        <CheckIcon className="size-8" />
      </span>
      <h1 className="mt-5 font-serif text-2xl font-bold">¡Recarga realizada!</h1>
      <p className="mt-2 text-3xl font-semibold">{formatMoney(topUp.amountCents, "ARS")}</p>
      <p className="mt-1 text-sm text-muted">
        {detail}
      </p>
      <p className="mt-4 text-sm text-muted">N.º de operación {movement.reference}</p>

      {topUp.kind === "SUBE" && (
        <div className="mt-6 w-full text-left">
          <SubeNotice />
        </div>
      )}

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
