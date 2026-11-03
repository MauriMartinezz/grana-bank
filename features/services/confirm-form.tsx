"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { confirmBillPayment } from "./actions";
import type { BillPaymentDraft } from "./confirmation";

function SubmitButton() {
  const { pending } = useFormStatus();
  // Disabled while pending, so a double tap sends one request; the
  // idempotency key covers retries and repeated submits anyway.
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Pagando…" : "Confirmar pago"}
    </Button>
  );
}

export function ConfirmBillPaymentForm({
  draft,
  idempotencyKey,
}: {
  draft: BillPaymentDraft;
  idempotencyKey: string;
}) {
  const [state, action] = useActionState(confirmBillPayment, undefined);

  return (
    <form action={action}>
      <input type="hidden" name="billId" value={draft.billId} />
      <input type="hidden" name="cardId" value={draft.cardId} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      {draft.note && <input type="hidden" name="note" value={draft.note} />}
      {state?.error && (
        <p role="alert" className="mb-4 text-center text-sm text-garnet">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
