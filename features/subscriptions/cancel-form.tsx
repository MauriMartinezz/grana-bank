"use client";

import { useFormStatus } from "react-dom";
import { cancelSubscription } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-12 w-full rounded-full border border-garnet font-serif text-sm text-garnet disabled:opacity-60"
    >
      {pending ? "Dando de baja…" : "Dar de baja"}
    </button>
  );
}

/** Cancels the subscription after the user confirms it. */
export function CancelSubscriptionForm({
  subscriptionId,
  merchant,
}: {
  subscriptionId: string;
  merchant: string;
}) {
  return (
    <form
      action={cancelSubscription}
      onSubmit={(event) => {
        if (!window.confirm(`¿Dar de baja ${merchant}? No se va a volver a cobrar.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="subscriptionId" value={subscriptionId} />
      <SubmitButton />
    </form>
  );
}
