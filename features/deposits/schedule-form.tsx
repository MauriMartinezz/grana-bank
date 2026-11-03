"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { WEEKDAY_NAMES, type DepositFrequency } from "./schedule";
import { createDepositSchedule } from "./schedule-actions";

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-line bg-surface px-4 text-sm placeholder:font-serif placeholder:text-muted";
const OPTION_CLASS =
  "flex min-h-11 cursor-pointer items-center justify-center rounded-2xl bg-surface font-serif text-sm has-checked:bg-garnet-fill has-checked:text-white has-focus-visible:outline-2";
const ERROR_CLASS = "mt-1.5 text-sm text-garnet";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Programando…" : "Programar ingreso"}
    </Button>
  );
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Account, amount, every week or every month, and the day. */
export function ScheduleDepositForm({
  accounts,
}: {
  accounts: { currency: "ARS" | "USD"; label: string }[];
}) {
  const [state, action] = useActionState(createDepositSchedule, undefined);
  // Controlled, so the day options follow the frequency and a failed submit keeps them.
  const [currency, setCurrency] = useState(accounts[0]?.currency ?? "ARS");
  const [frequency, setFrequency] = useState<DepositFrequency>("MONTHLY");
  const [day, setDay] = useState("1");
  const errors = state && "errors" in state ? state.errors : undefined;
  const typed = state && "values" in state ? state.values.amount : "";

  return (
    <form action={action} noValidate className="flex flex-col gap-5">
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Cuenta de destino</legend>
        <div className="grid grid-cols-2 gap-2">
          {accounts.map((account) => (
            <label key={account.currency} className={OPTION_CLASS}>
              <input
                type="radio"
                name="currency"
                value={account.currency}
                checked={currency === account.currency}
                onChange={() => setCurrency(account.currency)}
                className="sr-only"
              />
              {account.label}
            </label>
          ))}
        </div>
        {errors?.currency && <p role="alert" className={ERROR_CLASS}>{errors.currency}</p>}
      </fieldset>

      <div className="flex flex-col">
        <label htmlFor="scheduleAmount" className="mb-1.5 text-sm font-medium">
          Monto en {currency}
        </label>
        <input
          id="scheduleAmount"
          name="amount"
          key={typed}
          defaultValue={typed}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          aria-invalid={Boolean(errors?.amount)}
          className={INPUT_CLASS}
        />
        {errors?.amount && <p role="alert" className={ERROR_CLASS}>{errors.amount}</p>}
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Cada cuánto</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["MONTHLY", "Cada mes"],
              ["WEEKLY", "Cada semana"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className={OPTION_CLASS}>
              <input
                type="radio"
                name="frequency"
                value={value}
                checked={frequency === value}
                onChange={() => {
                  setFrequency(value);
                  setDay("1");
                }}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
        {errors?.frequency && <p role="alert" className={ERROR_CLASS}>{errors.frequency}</p>}
      </fieldset>

      <div className="flex flex-col">
        <label htmlFor="scheduleDay" className="mb-1.5 text-sm font-medium">
          {frequency === "MONTHLY" ? "Día del mes" : "Día de la semana"}
        </label>
        <select
          id="scheduleDay"
          name="day"
          value={day}
          onChange={(event) => setDay(event.target.value)}
          className={INPUT_CLASS}
        >
          {frequency === "MONTHLY"
            ? Array.from({ length: 31 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}
                </option>
              ))
            : WEEKDAY_NAMES.map((name, index) => (
                <option key={name} value={index + 1}>
                  {capitalize(name)}
                </option>
              ))}
        </select>
        {frequency === "MONTHLY" && Number(day) > 28 && (
          <p className="mt-1.5 text-xs text-muted">Si el mes tiene menos días, el último día.</p>
        )}
        {errors?.day && <p role="alert" className={ERROR_CLASS}>{errors.day}</p>}
      </div>

      {errors?.form && <p role="alert" className={ERROR_CLASS}>{errors.form}</p>}
      {state && "notice" in state && (
        <p role="status" className="text-sm text-muted">
          {state.notice}
        </p>
      )}

      <SubmitButton />
    </form>
  );
}
