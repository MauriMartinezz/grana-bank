"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { processMyScheduledPayments } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 w-full rounded-full border border-line font-serif text-sm disabled:opacity-60"
    >
      {pending ? "Procesando…" : "Procesar pagos agendados"}
    </button>
  );
}

/**
 * Runs today's scheduled and automatic payments of the signed-in user, so the
 * demo does not wait for the daily cron.
 */
export function ProcessScheduledButton() {
  const [state, action] = useActionState(processMyScheduledPayments, undefined);

  return (
    <form action={action} className="flex flex-col gap-2">
      <SubmitButton />
      {state && "error" in state && (
        <p role="alert" className="text-center text-sm text-garnet">
          {state.error}
        </p>
      )}
      {state && "notice" in state && (
        <p role="status" className="text-center text-sm text-muted">
          {state.notice}
        </p>
      )}
    </form>
  );
}
