"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { CardOption } from "@/features/exchange/queries";
import { reviewBillPayment } from "./actions";

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-line bg-surface px-4 text-sm placeholder:font-serif placeholder:text-muted";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Validando…" : "Continuar"}
    </Button>
  );
}

/** The paying card of a bill; the amount is the bill's and cannot change. */
export function PayBillForm({ billId, cards }: { billId: string; cards: CardOption[] }) {
  const [state, action] = useActionState(reviewBillPayment, undefined);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="billId" value={billId} />
      <div className="flex flex-col">
        <label htmlFor="cardId" className="mb-1.5 text-sm font-medium">
          Pagás con
        </label>
        <select id="cardId" name="cardId" defaultValue={cards[0]?.id} className={INPUT_CLASS}>
          {cards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.label} · {card.detail}
            </option>
          ))}
        </select>
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-garnet">
          {state.error}
        </p>
      )}
      <div className="pt-3">
        <SubmitButton />
      </div>
    </form>
  );
}
