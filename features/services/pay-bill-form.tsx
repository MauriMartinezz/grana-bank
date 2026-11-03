"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { NOTE_MAX_LENGTH } from "@/features/categories/names";
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

/**
 * The paying card of a bill and an optional note; the amount is the bill's
 * and cannot change. The note is kept in state, so an error keeps it.
 */
export function PayBillForm({ billId, cards }: { billId: string; cards: CardOption[] }) {
  const [state, action] = useActionState(reviewBillPayment, undefined);
  const [note, setNote] = useState("");

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
      <div className="flex flex-col">
        <label htmlFor="note" className="mb-1.5 text-sm font-medium">
          Nota <span className="font-normal text-muted">(opcional)</span>
        </label>
        <textarea
          id="note"
          name="note"
          rows={2}
          maxLength={NOTE_MAX_LENGTH}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Por ejemplo: luz del depto"
          aria-describedby="note-hint"
          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm placeholder:font-serif placeholder:text-muted"
        />
        <p id="note-hint" className="mt-1.5 text-xs text-muted">
          Solo la ves vos. {[...note].length}/{NOTE_MAX_LENGTH}
        </p>
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
