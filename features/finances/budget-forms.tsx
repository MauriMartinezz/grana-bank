"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { Currency } from "@/generated/prisma/client";
import { removeBudget, saveBudget, type BudgetFormState, type RemoveBudgetState } from "./actions";

const INPUT_CLASS =
  "h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 text-sm placeholder:font-serif placeholder:text-muted";
const SELECT_CLASS = "h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm";
const SMALL_BUTTON = "min-h-11 shrink-0 rounded-full px-4 font-serif text-sm disabled:opacity-60";

function SubmitButton({
  label,
  pendingLabel,
  className,
}: {
  label: string;
  pendingLabel: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${SMALL_BUTTON} ${className}`}>
      {pending ? pendingLabel : label}
    </button>
  );
}

function Feedback({ state, id }: { state: BudgetFormState | RemoveBudgetState; id: string }) {
  if (state && "error" in state) {
    return (
      <p id={id} role="alert" className="mt-1.5 text-sm text-garnet">
        {state.error}
      </p>
    );
  }
  if (state && "notice" in state) {
    return (
      <p id={id} role="status" className="mt-1.5 text-sm text-muted">
        {state.notice}
      </p>
    );
  }
  return null;
}

function currencyName(currency: Currency) {
  return currency === "USD" ? "dólares" : "pesos";
}

/**
 * Sets or changes a category's monthly budget, and removes it when there is
 * one. `amount` is the current budget formatted as typed (`150.000,00`).
 */
export function BudgetEditor({
  categoryId,
  categoryName,
  currency,
  budget,
}: {
  categoryId: string;
  categoryName: string;
  currency: Currency;
  budget: { id: string; amount: string } | null;
}) {
  const [state, action] = useActionState(saveBudget, undefined);
  const [removeState, removeAction] = useActionState(removeBudget, undefined);
  const inputId = `budget-${categoryId}`;
  const failed = Boolean(state && "error" in state);

  return (
    <div>
      <form action={action}>
        <input type="hidden" name="categoryId" value={categoryId} />
        <input type="hidden" name="currency" value={currency} />
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">
          Presupuesto mensual de {categoryName} en {currencyName(currency)}
        </label>
        <div className="flex gap-2">
          <input
            id={inputId}
            name="amount"
            inputMode="decimal"
            autoComplete="off"
            defaultValue={state && "error" in state ? state.value : (budget?.amount ?? "")}
            placeholder="Por ejemplo: 150.000"
            aria-invalid={failed}
            aria-describedby={`${inputId}-feedback`}
            className={INPUT_CLASS}
          />
          <SubmitButton
            label={budget ? "Cambiar" : "Definir"}
            pendingLabel="Guardando…"
            className="bg-garnet-fill text-white"
          />
        </div>
        <Feedback state={state} id={`${inputId}-feedback`} />
      </form>
      {budget && (
        <form action={removeAction} className="mt-2">
          <input type="hidden" name="budgetId" value={budget.id} />
          <SubmitButton
            label={`Quitar presupuesto de ${categoryName}`}
            pendingLabel="Quitando…"
            className="px-0 text-garnet"
          />
          <Feedback state={removeState} id={`${inputId}-remove-feedback`} />
        </form>
      )}
    </div>
  );
}

/** Defines a budget for a category with no budget in this currency yet. */
export function AddBudgetForm({
  categories,
  currency,
}: {
  categories: { id: string; name: string }[];
  currency: Currency;
}) {
  const [state, action] = useActionState(saveBudget, undefined);
  const failed = Boolean(state && "error" in state);

  return (
    <form action={action} className="rounded-2xl bg-surface p-4">
      <input type="hidden" name="currency" value={currency} />
      <label htmlFor="newBudgetCategory" className="mb-1.5 block text-sm font-medium">
        Categoría
      </label>
      <select id="newBudgetCategory" name="categoryId" className={SELECT_CLASS}>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
      <label htmlFor="newBudgetAmount" className="mt-3 mb-1.5 block text-sm font-medium">
        Cuánto querés gastar por mes, en {currencyName(currency)}
      </label>
      <div className="flex gap-2">
        <input
          id="newBudgetAmount"
          name="amount"
          inputMode="decimal"
          autoComplete="off"
          // A new key after a save clears the input; an error keeps the text.
          key={state && "notice" in state ? state.notice : "new"}
          defaultValue={state && "error" in state ? state.value : ""}
          placeholder="Por ejemplo: 150.000"
          aria-invalid={failed}
          aria-describedby="newBudget-feedback"
          className={INPUT_CLASS}
        />
        <SubmitButton label="Definir" pendingLabel="Guardando…" className="bg-garnet-fill text-white" />
      </div>
      <Feedback state={state} id="newBudget-feedback" />
    </form>
  );
}
