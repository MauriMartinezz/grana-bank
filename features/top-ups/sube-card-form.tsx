"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { addSubeCard } from "./actions";
import { formatSubeNumber, NICKNAME_MAX_LENGTH } from "./validation";

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-line bg-surface px-4 text-sm placeholder:font-serif placeholder:text-muted";
const ERROR_CLASS = "mt-1.5 text-sm text-garnet";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Agregando…" : "Agregar tarjeta SUBE"}
    </Button>
  );
}

export function SubeCardForm() {
  const [state, action] = useActionState(addSubeCard, undefined);
  // Controlled, so the grouping shows while typing and a failed submit keeps it.
  const [number, setNumber] = useState("");
  const errors = state?.errors;

  return (
    <form action={action} noValidate className="flex flex-col">
      <label htmlFor="number" className="mb-1.5 text-sm font-medium">
        Número de la tarjeta SUBE
      </label>
      <input
        id="number"
        name="number"
        inputMode="numeric"
        autoComplete="off"
        placeholder="6061 0000 0000 0000"
        // 16 digits plus the three spaces between groups.
        maxLength={19}
        value={number}
        onChange={(event) => setNumber(formatSubeNumber(event.target.value))}
        aria-invalid={Boolean(errors?.number)}
        aria-describedby={errors?.number ? "number-hint number-error" : "number-hint"}
        className={`${INPUT_CLASS} tracking-wide`}
      />
      <p id="number-hint" className="mt-1.5 text-xs text-muted">
        Son 16 números que empiezan con 6061, al dorso de la tarjeta.
      </p>
      {errors?.number && (
        <p id="number-error" role="alert" className={ERROR_CLASS}>
          {errors.number}
        </p>
      )}

      <label htmlFor="nickname" className="mt-4 mb-1.5 text-sm font-medium">
        Nombre para reconocerla
      </label>
      <input
        id="nickname"
        name="nickname"
        autoComplete="off"
        placeholder="sube de mauri"
        maxLength={NICKNAME_MAX_LENGTH + 10}
        defaultValue={state?.values.nickname}
        key={state?.values.nickname}
        aria-invalid={Boolean(errors?.nickname)}
        aria-describedby={errors?.nickname ? "nickname-error" : undefined}
        className={INPUT_CLASS}
      />
      {errors?.nickname && (
        <p id="nickname-error" role="alert" className={ERROR_CLASS}>
          {errors.nickname}
        </p>
      )}

      {errors?.form && (
        <p role="alert" className={ERROR_CLASS}>
          {errors.form}
        </p>
      )}

      <div className="pt-8">
        <SubmitButton />
      </div>
    </form>
  );
}
