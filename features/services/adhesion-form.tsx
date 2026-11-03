"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { adhereService } from "./actions";
import {
  COMPANY_INFO,
  NICKNAME_MAX_LENGTH,
  normalizePaymentNumber,
  SERVICE_COMPANIES,
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

/** Company, electronic payment number and nickname. The server checks them again. */
export function AdhesionForm() {
  const [state, action] = useActionState(adhereService, undefined);
  // Controlled, so the number hint follows the company and a failed submit
  // keeps what was typed.
  const [company, setCompany] = useState<ServiceCompany>("AYSA");
  const [number, setNumber] = useState("");
  const errors = state?.errors;
  const { name, numberLength } = COMPANY_INFO[company];
  const valid = normalizePaymentNumber(company, number) !== null;

  return (
    <form action={action} noValidate className="flex flex-col">
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Empresa</legend>
        <div className="grid grid-cols-2 gap-2">
          {SERVICE_COMPANIES.map((option) => (
            <label
              key={option}
              className="flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-2xl bg-surface py-1.5 font-serif text-sm has-checked:bg-garnet-fill has-checked:text-white has-focus-visible:outline-2"
            >
              <input
                type="radio"
                name="company"
                value={option}
                checked={company === option}
                onChange={() => setCompany(option)}
                className="sr-only"
              />
              {COMPANY_INFO[option].name}
              <span className="text-xs opacity-80">{COMPANY_INFO[option].service}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {errors?.company && (
        <p role="alert" className={ERROR_CLASS}>
          {errors.company}
        </p>
      )}

      <label htmlFor="paymentNumber" className="mt-5 mb-1.5 text-sm font-medium">
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
