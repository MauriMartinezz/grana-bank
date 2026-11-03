"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { WEEKDAY_NAMES, type DepositFrequency } from "@/features/deposits/schedule";
import { createTopUpSchedule } from "./schedule-actions";

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-line bg-surface px-4 text-sm placeholder:font-serif placeholder:text-muted";
const OPTION_CLASS =
  "flex min-h-11 cursor-pointer items-center justify-center rounded-2xl bg-surface font-serif text-sm has-checked:bg-garnet-fill has-checked:text-white has-focus-visible:outline-2";
const ERROR_CLASS = "mt-1.5 text-sm text-garnet";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 w-full rounded-full border border-line font-serif text-sm disabled:opacity-60"
    >
      {pending ? "Programando…" : "Programar recarga"}
    </button>
  );
}

/** A recurring top-up of one SUBE card: amount, every week or month, and the day. */
export function TopUpScheduleForm({ subeCardId }: { subeCardId: string }) {
  const [state, action] = useActionState(createTopUpSchedule, undefined);
  const [frequency, setFrequency] = useState<DepositFrequency>("MONTHLY");
  const [day, setDay] = useState("1");
  const errors = state && "errors" in state ? state.errors : undefined;
  const typed = state && "values" in state ? state.values.amount : "";

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="subeCardId" value={subeCardId} />
      <div className="flex flex-col">
        <label htmlFor="scheduleTopUpAmount" className="mb-1.5 text-sm font-medium">
          Monto
        </label>
        <input
          id="scheduleTopUpAmount"
          name="amount"
          key={typed}
          defaultValue={typed}
          inputMode="decimal"
          autoComplete="off"
          placeholder="10.000"
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
      </fieldset>
      <div className="flex flex-col">
        <label htmlFor="scheduleTopUpDay" className="mb-1.5 text-sm font-medium">
          {frequency === "MONTHLY" ? "Día del mes" : "Día de la semana"}
        </label>
        <select
          id="scheduleTopUpDay"
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
                  {name.charAt(0).toUpperCase() + name.slice(1)}
                </option>
              ))}
        </select>
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
