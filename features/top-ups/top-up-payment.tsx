import Link from "next/link";
import { StateMessage } from "@/components/ui/state-message";
import { formatMoney } from "@/lib/format";
import { getPesoPayment } from "./queries";
import { TopUpForm } from "./top-up-form";
import type { TopUpKind } from "./validation";

/**
 * The top-up form with the peso cards to pay with, or why it cannot show:
 * top-ups are paid from a card of the peso account.
 */
export async function TopUpPayment({
  userId,
  kind,
  subeCardId,
}: {
  userId: string;
  kind: TopUpKind;
  subeCardId?: string;
}) {
  const payment = await getPesoPayment(userId);
  if (!payment) {
    return (
      <StateMessage
        title="No tenés una cuenta en pesos"
        description="Las recargas se pagan con una tarjeta de tu cuenta en pesos."
      />
    );
  }
  if (payment.cards.length === 0) {
    return (
      <StateMessage
        title="Te falta una tarjeta"
        description="Agregá una tarjeta a tu cuenta en pesos para pagar recargas."
      >
        <Link href="/tarjetas/nueva" className="mt-2 font-serif text-sm text-garnet">
          Agregar tarjeta
        </Link>
      </StateMessage>
    );
  }
  return (
    <>
      <p className="mb-5 text-sm text-muted">
        Disponible en pesos: <span className="font-medium text-ink">{formatMoney(payment.balanceCents, "ARS")}</span>
      </p>
      <TopUpForm kind={kind} subeCardId={subeCardId} cards={payment.cards} />
    </>
  );
}
