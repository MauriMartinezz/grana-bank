"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { Currency } from "@/generated/prisma/client";
import { confirmDeposit } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  // Disabled while pending; the key in the form covers retries anyway.
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Ingresando…" : "Confirmar ingreso"}
    </Button>
  );
}

export function ConfirmDepositForm({
  currency,
  amountCents,
  idempotencyKey,
}: {
  currency: Currency;
  amountCents: number;
  idempotencyKey: string;
}) {
  const [state, action] = useActionState(confirmDeposit, undefined);

  return (
    <form action={action}>
      <input type="hidden" name="currency" value={currency} />
      <input type="hidden" name="amountCents" value={amountCents} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {state?.error && (
        <p role="alert" className="mb-4 text-center text-sm text-garnet">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
