import Link from "next/link";
import { StateMessage } from "@/components/ui/state-message";
import { getPesoPayment } from "./queries";
import { TopUpForm } from "./top-up-form";
import type { TopUpKind, TopUpProvider } from "./validation";
import { Balance } from "@/features/account/balance";

/**
 * The top-up form with the peso cards to pay with, or why it cannot show:
 * top-ups are paid from a card of the peso account.
 */
export async function TopUpPayment({
  userId,
  kind,
  provider,
  subeCardId,
}: {
  userId: string;
  kind: TopUpKind;
  /** The company picked on the previous screen. */
  provider?: TopUpProvider;
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
        Disponible en pesos: <span className="font-medium text-ink"><Balance cents={payment.balanceCents} currency="ARS" /></span>
      </p>
      <TopUpForm kind={kind} provider={provider} subeCardId={subeCardId} cards={payment.cards} />
    </>
  );
}
