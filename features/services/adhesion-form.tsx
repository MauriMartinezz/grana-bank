"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { adhereService } from "./actions";
import {
  COMPANY_INFO,
  NICKNAME_MAX_LENGTH,
  normalizePaymentNumber,
  type ServiceCompany,
} from "./companies";

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-line bg-surface px-4 text-sm placeholder:font-serif placeholder:text-muted";
const ERROR_CLASS = "mt-1.5 text-sm text-garnet";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Adhiriendo…" : "Adherir servicio"}
    </Button>
  );
}

/**
 * The electronic payment number and nickname of the company picked on the
 * previous screen. The server checks them again.
 */
export function AdhesionForm({ company }: { company: ServiceCompany }) {
  const [state, action] = useActionState(adhereService, undefined);
  // Controlled, so the hint follows what is typed and a failed submit keeps it.
  const [number, setNumber] = useState("");
  const errors = state?.errors;
  const { name, numberLength } = COMPANY_INFO[company];
  const valid = normalizePaymentNumber(company, number) !== null;

  return (
    <form action={action} noValidate className="flex flex-col">
      <input type="hidden" name="company" value={company} />
      {errors?.company && (
        <p role="alert" className={ERROR_CLASS}>
          {errors.company}
        </p>
      )}

      <label htmlFor="paymentNumber" className="mb-1.5 text-sm font-medium">
        Número de pago electrónico
      </label>
      <input
        id="paymentNumber"
        name="paymentNumber"
        inputMode="numeric"
        autoComplete="off"
        placeholder={"0".repeat(numberLength)}
        maxLength={numberLength + 4}
        value={number}
        onChange={(event) => setNumber(event.target.value)}
        aria-invalid={Boolean(errors?.paymentNumber)}
        aria-describedby={errors?.paymentNumber ? "number-hint number-error" : "number-hint"}
        className={`${INPUT_CLASS} tracking-wide`}
      />
      <p id="number-hint" className="mt-1.5 text-xs text-muted" aria-live="polite">
        {valid
          ? `${numberLength} dígitos: listo.`
          : `Figura en tu factura de ${name}: son ${numberLength} números.`}
      </p>
      {errors?.paymentNumber && (
        <p id="number-error" role="alert" className={ERROR_CLASS}>
          {errors.paymentNumber}
        </p>
      )}

      <label htmlFor="nickname" className="mt-4 mb-1.5 text-sm font-medium">
        Nombre para reconocerlo
      </label>
      <input
        id="nickname"
        name="nickname"
        autoComplete="off"
        placeholder="Luz depto"
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
