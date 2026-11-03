"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { confirmTopUp } from "./actions";
import type { TopUpDraft } from "./confirmation";

function SubmitButton() {
  const { pending } = useFormStatus();
  // Disabled while pending, so a double tap sends one request; the
  // idempotency key covers retries and repeated submits anyway.
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Recargando…" : "Confirmar recarga"}
    </Button>
  );
}

export function ConfirmTopUpForm({
  draft,
  idempotencyKey,
}: {
  draft: TopUpDraft;
  idempotencyKey: string;
}) {
  const [state, action] = useActionState(confirmTopUp, undefined);

  return (
    <form action={action}>
      <input type="hidden" name="kind" value={draft.kind} />
      <input type="hidden" name="provider" value={draft.provider} />
      <input type="hidden" name="target" value={draft.target} />
      <input type="hidden" name="amountCents" value={draft.amountCents} />
      <input type="hidden" name="cardId" value={draft.cardId} />
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
