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
  recipientAccountId,
  amountCents,
  idempotencyKey,
  saveContactName,
}: {
  recipientAccountId: string;
  amountCents: number;
  idempotencyKey: string;
  /** Offers to save the recipient as a contact; null when they already are one. */
  saveContactName: string | null;
}) {
  const [state, action] = useActionState(confirmTransfer, undefined);

  return (
    <form action={action}>
      <input type="hidden" name="recipientAccountId" value={recipientAccountId} />
      <input type="hidden" name="amountCents" value={amountCents} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {saveContactName && (
        <label className="mb-4 flex min-h-12 items-center gap-3 text-sm">
          <input type="checkbox" name="saveContact" className="size-5 accent-garnet" />
          Guardar a {saveContactName} en mis contactos
        </label>
      )}
      {state?.error && (
        <p role="alert" className="mb-4 text-center text-sm text-garnet">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
