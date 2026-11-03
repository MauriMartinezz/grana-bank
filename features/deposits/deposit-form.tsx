"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { Currency } from "@/generated/prisma/client";
import { reviewDeposit } from "./actions";

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

/** The destination account and the amount; the currency is kept in state. */
export function DepositForm({
  accounts,
}: {
  accounts: { currency: Currency; alias: string; label: string }[];
}) {
  const [state, action] = useActionState(reviewDeposit, undefined);
  const [currency, setCurrency] = useState<Currency>(accounts[0]?.currency ?? "ARS");
  const error = state?.error;

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Cuenta de destino</legend>
        <div className="grid grid-cols-2 gap-2">
          {accounts.map((account) => (
            <label
              key={account.currency}
              className="flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-2xl bg-surface py-1.5 font-serif text-sm has-checked:bg-garnet-fill has-checked:text-white has-focus-visible:outline-2"
            >
              <input
                type="radio"
                name="currency"
                value={account.currency}
                checked={currency === account.currency}
                onChange={() => setCurrency(account.currency)}
                className="sr-only"
              />
              {account.label}
              <span className="text-xs opacity-80">{account.alias}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col">
        <label htmlFor="depositAmount" className="mb-1.5 text-sm font-medium">
          Monto en {currency}
        </label>
        <input
          id="depositAmount"
          name="amount"
          defaultValue={state?.value}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "depositAmount-error" : undefined}
          className={INPUT_CLASS}
        />
        {error && (
          <p id="depositAmount-error" role="alert" className="mt-1.5 text-sm text-garnet">
            {error}
          </p>
        )}
      </div>

      <div className="pt-3">
        <SubmitButton />
      </div>
    </form>
  );
}
