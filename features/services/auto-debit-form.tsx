"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { CardOption } from "@/features/exchange/queries";
import { saveAutoDebit } from "./actions";

const INPUT_CLASS = "h-11 w-full rounded-xl border border-line bg-surface px-4 text-sm";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Guardando…" : "Guardar"}
    </Button>
  );
}

/** Pays every bill of the service on its due date with the chosen card. */
export function AutoDebitForm({
  adhesionId,
  cards,
  selected,
}: {
  adhesionId: string;
  cards: CardOption[];
  /** The current card, or "" when the automatic debit is off. */
  selected: string;
}) {
  const [state, action] = useActionState(saveAutoDebit, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="adhesionId" value={adhesionId} />
      <div className="flex flex-col">
        <label htmlFor="autoDebitCardId" className="mb-1.5 text-sm font-medium">
          Débito automático
        </label>
        <select
          id="autoDebitCardId"
          name="cardId"
          defaultValue={selected}
          className={INPUT_CLASS}
        >
          <option value="">Desactivado</option>
          {cards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.label} · {card.detail}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-muted">
          Pagamos cada factura el día que vence. Si no hay saldo, te avisamos y no se cobra.
        </p>
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
