"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { subscribe } from "./actions";

function SubmitButton({ merchant }: { merchant: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={`Suscribirme a ${merchant}`}
      className="flex min-h-11 shrink-0 items-center rounded-full bg-garnet-fill px-5 font-serif text-sm text-white disabled:opacity-60"
    >
      {pending ? "Agregando…" : "Suscribirme"}
    </button>
  );
}

/** One catalog row: its details, a subscribe button and the error under both. */
export function SubscribeForm({
  slug,
  merchant,
  children,
}: {
  slug: string;
  merchant: string;
  children: ReactNode;
}) {
  const [state, action] = useActionState(subscribe, undefined);

  return (
    <form action={action}>
      <input type="hidden" name="slug" value={slug} />
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">{children}</div>
        <SubmitButton merchant={merchant} />
      </div>
      {state?.error && (
        <p role="alert" className="mt-3 text-sm text-garnet">
          {state.error}
        </p>
      )}
    </form>
  );
}
