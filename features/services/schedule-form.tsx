"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { CardOption } from "@/features/exchange/queries";
import { scheduleBillPayment } from "./actions";

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-line bg-surface px-4 text-sm placeholder:font-serif placeholder:text-muted";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Programando…" : "Programar pago"}
    </Button>
  );
}

/**
 * A one-off payment of the bill on a day from today to its due date. The
 * balance is checked on that day, not now.
 */
export function ScheduleForm({
  billId,
  cards,
  min,
  max,
}: {
  billId: string;
  cards: CardOption[];
  /** `YYYY-MM-DD` dates for the date input. */
  min: string;
  max: string;
}) {
  const [state, action] = useActionState(scheduleBillPayment, undefined);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="billId" value={billId} />
      <div className="flex flex-col">
        <label htmlFor="scheduleDate" className="mb-1.5 text-sm font-medium">
          Fecha del pago
        </label>
        <input
          id="scheduleDate"
          name="date"
          type="date"
          required
          min={min}
          max={max}
          defaultValue={max}
          className={INPUT_CLASS}
        />
      </div>
      <div className="flex flex-col">
        <label htmlFor="scheduleCardId" className="mb-1.5 text-sm font-medium">
          Pagás con
        </label>
        <select
          id="scheduleCardId"
          name="cardId"
          defaultValue={cards[0]?.id}
          className={INPUT_CLASS}
        >
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
      <SubmitButton />
    </form>
  );
}
