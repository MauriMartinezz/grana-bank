"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { NOTE_MAX_LENGTH } from "@/features/categories/names";
import { reviewAmount } from "./actions";

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
 * The amount, plus an optional note for both sides and a category of the
 * sender's. The note and the category are kept in state, so an amount error
 * does not wipe them when React resets the form.
 */
export function AmountForm({
  recipientAccountId,
  currency,
  categories,
}: {
  recipientAccountId: string;
  currency: string;
  categories: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(reviewAmount, undefined);
  const [note, setNote] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const errorOn = (field: "amount" | "note" | "category") =>
    state?.error && (state.field ?? "amount") === field ? state.error : null;
  const amountError = errorOn("amount");
  const noteError = errorOn("note");
  const categoryError = errorOn("category");

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="recipientAccountId" value={recipientAccountId} />
      <div className="flex flex-col">
        <label htmlFor="amount" className="mb-1.5 text-sm font-medium">
          Monto en {currency}
        </label>
        <input
          id="amount"
          name="amount"
          defaultValue={state?.value}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          aria-invalid={Boolean(amountError)}
          aria-describedby={amountError ? "amount-error" : undefined}
          className={INPUT_CLASS}
        />
        {amountError && (
          <p id="amount-error" role="alert" className="mt-1.5 text-sm text-garnet">
            {amountError}
          </p>
        )}
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
          placeholder="Por ejemplo: alquiler de noviembre"
          aria-invalid={Boolean(noteError)}
          aria-describedby="note-hint"
          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm placeholder:font-serif placeholder:text-muted"
        />
        <p id="note-hint" className="mt-1.5 text-xs text-muted">
          La ve también quien recibe. {[...note].length}/{NOTE_MAX_LENGTH}
        </p>
        {noteError && (
          <p role="alert" className="mt-1.5 text-sm text-garnet">
            {noteError}
          </p>
        )}
      </div>

      <div className="flex flex-col">
        <label htmlFor="categoryId" className="mb-1.5 text-sm font-medium">
          Categoría <span className="font-normal text-muted">(solo la ves vos)</span>
        </label>
        <select
          id="categoryId"
          name="categoryId"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          aria-invalid={Boolean(categoryError)}
          className={INPUT_CLASS}
        >
          <option value="">Sin categoría</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {categoryError && (
          <p role="alert" className="mt-1.5 text-sm text-garnet">
            {categoryError}
          </p>
        )}
      </div>

      <div className="pt-3">
        <SubmitButton />
      </div>
    </form>
  );
}
