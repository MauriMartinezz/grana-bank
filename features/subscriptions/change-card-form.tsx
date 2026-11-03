"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { CardOption } from "@/features/exchange/queries";
import { changeSubscriptionCard } from "./actions";

const INPUT_CLASS = "h-11 w-full rounded-xl border border-line bg-surface px-4 text-sm";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Guardando…" : "Cambiar tarjeta"}
    </Button>
  );
}

/** Picks which of the user's cards the subscription would be charged to. */
export function ChangeCardForm({
  subscriptionId,
  cards,
  selected,
}: {
  subscriptionId: string;
  cards: CardOption[];
  /** The current card, or "" when it was removed. */
  selected: string;
}) {
  const [state, action] = useActionState(changeSubscriptionCard, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="subscriptionId" value={subscriptionId} />
      <div className="flex flex-col">
        <label htmlFor="subscriptionCardId" className="mb-1.5 text-sm font-medium">
          Tarjeta
        </label>
        <select
          id="subscriptionCardId"
          name="cardId"
          defaultValue={selected}
          required
          className={INPUT_CLASS}
        >
          {!selected && <option value="">Elegí una tarjeta</option>}
          {cards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.label} · {card.detail}
            </option>
          ))}
        </select>
      </div>
      {state && "error" in state && (
        <p role="alert" className="text-sm text-garnet">
          {state.error}
        </p>
      )}
      {state && "notice" in state && (
        <p role="status" className="text-sm text-muted">
          {state.notice}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
