"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { addCard } from "./actions";
import { BrandMark } from "./brand-mark";
import { ACCOUNT_LABELS } from "./account-label";
import type { CardAccount } from "./queries";
import {
  BRAND_NAMES,
  HOLDER_MAX_LENGTH,
  cvvLength,
  detectBrand,
  formatCardNumber,
} from "./validation";

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-line bg-surface px-4 text-sm placeholder:font-serif placeholder:text-muted";

const ERROR_CLASS = "mt-1.5 text-sm text-garnet";

// 19 digits plus the spaces between groups of 4.
const NUMBER_MAX_LENGTH = 23;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Agregando…" : "Agregar tarjeta"}
    </Button>
  );
}

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) return null;
  return (
    <p id={id} role="alert" className={ERROR_CLASS}>
      {error}
    </p>
  );
}

/** Adds "/" after the month while the expiry is typed. */
function formatExpiry(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

export function CardForm({ accounts }: { accounts: CardAccount[] }) {
  const [state, action] = useActionState(addCard, undefined);
  // Controlled, so a failed submit keeps them: the server never sends the
  // number or the code back.
  const [number, setNumber] = useState("");
  const [cvv, setCvv] = useState("");
  const [expiry, setExpiry] = useState("");
  const errors = state?.errors;
  const brand = detectBrand(number);
  const codeLength = cvvLength(brand);

  const describe = (field: keyof NonNullable<typeof errors>, hint?: string) =>
    [hint, errors?.[field] ? `${field}-error` : undefined].filter(Boolean).join(" ") ||
    undefined;

  return (
    <form action={action} noValidate className="flex flex-col">
      <label htmlFor="number" className="mb-1.5 text-sm font-medium">
        Número de tarjeta
      </label>
      <div className="relative">
        <input
          id="number"
          name="number"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="0000 0000 0000 0000"
          maxLength={NUMBER_MAX_LENGTH}
          value={number}
          onChange={(event) => setNumber(formatCardNumber(event.target.value))}
          aria-invalid={Boolean(errors?.number)}
          aria-describedby={describe("number", "number-brand")}
          className={`${INPUT_CLASS} pr-16 tracking-wide`}
        />
        <BrandMark brand={brand} className="absolute top-1.5 right-2" aria-hidden="true" />
      </div>
      <p id="number-brand" aria-live="polite" className="mt-1.5 text-xs text-muted">
        {brand
          ? `Tarjeta ${BRAND_NAMES[brand]}`
          : "Aceptamos Visa, Mastercard y American Express."}
      </p>
      <FieldError id="number-error" error={errors?.number} />

      <label htmlFor="holder" className="mt-4 mb-1.5 text-sm font-medium">
        Nombre como figura en la tarjeta
      </label>
      <input
        id="holder"
        name="holder"
        autoComplete="cc-name"
        autoCapitalize="words"
        placeholder="Ana Pérez"
        maxLength={HOLDER_MAX_LENGTH + 10}
        defaultValue={state?.values.holder}
        aria-invalid={Boolean(errors?.holder)}
        aria-describedby={describe("holder")}
        className={INPUT_CLASS}
      />
      <FieldError id="holder-error" error={errors?.holder} />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="expiry" className="mb-1.5 block text-sm font-medium">
            Vencimiento
          </label>
          <input
            id="expiry"
            name="expiry"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/AA"
            maxLength={5}
            value={expiry}
            onChange={(event) => setExpiry(formatExpiry(event.target.value))}
            aria-invalid={Boolean(errors?.expiry)}
            aria-describedby={describe("expiry")}
            className={INPUT_CLASS}
          />
          <FieldError id="expiry-error" error={errors?.expiry} />
        </div>
        <div>
          <label htmlFor="cvv" className="mb-1.5 block text-sm font-medium">
            Código de seguridad
          </label>
          <input
            id="cvv"
            name="cvv"
            type="password"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder={"0".repeat(codeLength)}
            maxLength={codeLength}
            value={cvv}
            onChange={(event) => setCvv(event.target.value.replace(/\D/g, ""))}
            aria-invalid={Boolean(errors?.cvv)}
            aria-describedby={describe("cvv", "cvv-hint")}
            className={INPUT_CLASS}
          />
          <p id="cvv-hint" className="mt-1.5 text-xs text-muted">
            {brand === "AMEX" ? "4 dígitos, en el frente." : "3 dígitos, al dorso."}
          </p>
          <FieldError id="cvv-error" error={errors?.cvv} />
        </div>
      </div>

      <label htmlFor="accountId" className="mt-4 mb-1.5 text-sm font-medium">
        Cuenta
      </label>
      <select
        id="accountId"
        name="accountId"
        // A new select per result, so the chosen account comes back after a submit.
        key={state?.values.accountId}
        defaultValue={state?.values.accountId ?? accounts[0]?.id}
        aria-invalid={Boolean(errors?.accountId)}
        aria-describedby={describe("accountId")}
        className={INPUT_CLASS}
      >
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {ACCOUNT_LABELS[account.currency]} ({account.currency}) · {account.alias}
          </option>
        ))}
      </select>
      <FieldError id="accountId-error" error={errors?.accountId} />

      {errors?.form && (
        <p role="alert" className={ERROR_CLASS}>
          {errors.form}
        </p>
      )}

      <p className="mt-6 text-xs text-muted">
        Solo guardamos la marca, los últimos 4 dígitos, el nombre y el vencimiento. Nunca el
        número completo ni el código de seguridad.
      </p>

      <div className="pt-6">
        <SubmitButton />
      </div>
    </form>
  );
}
