"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { ExchangeDirection } from "@/generated/prisma/client";
import { confirmExchange } from "./actions";

const LABELS: Record<ExchangeDirection, { idle: string; pending: string }> = {
  BUY: { idle: "Confirmar compra", pending: "Comprando…" },
  SELL: { idle: "Confirmar venta", pending: "Vendiendo…" },
};

function SubmitButton({ direction }: { direction: ExchangeDirection }) {
  const { pending } = useFormStatus();
  // Disabled while pending, so a double tap sends one request; the
  // idempotency key covers retries and repeated submits anyway.
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? LABELS[direction].pending : LABELS[direction].idle}
    </Button>
  );
}

export function ConfirmExchangeForm({
  direction,
  usdCents,
  fromCardId,
  toCardId,
  idempotencyKey,
}: {
  direction: ExchangeDirection;
  usdCents: number;
  fromCardId: string;
  toCardId: string;
  idempotencyKey: string;
}) {
  const [state, action] = useActionState(confirmExchange, undefined);

  return (
    <form action={action}>
      <input type="hidden" name="direction" value={direction} />
      <input type="hidden" name="usdCents" value={usdCents} />
      <input type="hidden" name="fromCardId" value={fromCardId} />
      <input type="hidden" name="toCardId" value={toCardId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {state?.error && (
        <p role="alert" className="mb-4 text-center text-sm text-garnet">
          {state.error}
        </p>
      )}
      <SubmitButton direction={direction} />
    </form>
  );
}
