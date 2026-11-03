"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { confirmTransfer } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  // Disabled while pending, so a double tap sends one request; the
  // idempotency key covers retries and repeated submits anyway.
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Transfiriendo…" : "Confirmar transferencia"}
    </Button>
  );
}

export function ConfirmForm({
  recipientId,
  amountCents,
  idempotencyKey,
}: {
  recipientId: string;
  amountCents: number;
  idempotencyKey: string;
}) {
  const [state, action] = useActionState(confirmTransfer, undefined);

  return (
    <form action={action}>
      <input type="hidden" name="recipientId" value={recipientId} />
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
