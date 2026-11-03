"use client";

import { useActionState, type InputHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { Currency } from "@/generated/prisma/enums";
import {
  updateAlias,
  updateEmail,
  updatePreferredCurrency,
  updateProfile,
} from "./actions";

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-line bg-white px-4 text-sm placeholder:font-serif placeholder:text-muted";
const ERROR_CLASS = "mt-1.5 text-sm text-garnet";
const SUCCESS_CLASS = "mt-3 text-sm text-muted";

const CURRENCY_LABELS: Record<Currency, string> = {
  ARS: "Pesos (ARS)",
  USD: "Dólares (USD)",
};

function SubmitButton({ label = "Guardar" }: { label?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="mt-5 w-full">
      {pending ? "Guardando…" : label}
    </Button>
  );
}

function Field({
  id,
  label,
  error,
  className = "",
  ...input
}: { id: string; label: string; error?: string; className?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const errorId = `${id}-error`;
  return (
    <div className={`flex flex-col ${className}`}>
      <label htmlFor={id} className="mb-1.5 text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={INPUT_CLASS}
        {...input}
      />
      {error && (
        <p id={errorId} role="alert" className={ERROR_CLASS}>
          {error}
        </p>
      )}
    </div>
  );
}

function FormError({ error }: { error?: string }) {
  return error ? (
    <p role="alert" className={ERROR_CLASS}>
      {error}
    </p>
  ) : null;
}

function Saved({ saved, message }: { saved?: boolean; message: string }) {
  return saved ? (
    <p role="status" className={SUCCESS_CLASS}>
      {message}
    </p>
  ) : null;
}

export function PersonalDataForm({
  initial,
}: {
  initial: { firstName: string; lastName: string; address: string; phone: string };
}) {
  const [state, action] = useActionState(updateProfile, undefined);
  const values = state?.values ?? initial;
  const errors = state?.errors;

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <Field
        id="firstName"
        name="firstName"
        label="Nombre"
        autoComplete="given-name"
        defaultValue={values.firstName}
        error={errors?.firstName}
      />
      <Field
        id="lastName"
        name="lastName"
        label="Apellido"
        autoComplete="family-name"
        defaultValue={values.lastName}
        error={errors?.lastName}
      />
      <Field
        id="address"
        name="address"
        label="Dirección (opcional)"
        autoComplete="street-address"
        placeholder="Calle, número, ciudad"
        defaultValue={values.address}
        error={errors?.address}
      />
      <Field
        id="phone"
        name="phone"
        label="Teléfono (opcional)"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+54 11 1234-5678"
        defaultValue={values.phone}
        error={errors?.phone}
      />
      <FormError error={errors?.form} />
      <div>
        <SubmitButton label="Guardar datos" />
        <Saved saved={state?.saved} message="Guardamos tus datos." />
      </div>
    </form>
  );
}

export function EmailForm() {
  const [state, action] = useActionState(updateEmail, undefined);
  const errors = state?.errors;

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <Field
        id="email"
        name="email"
        label="Nuevo email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="tu@email.com"
        defaultValue={state?.saved ? "" : state?.value}
        error={errors?.email}
      />
      <Field
        id="password"
        name="password"
        label="Contraseña actual"
        type="password"
        autoComplete="current-password"
        placeholder="Tu contraseña"
        error={errors?.password}
      />
      <FormError error={errors?.form} />
      <div>
        <SubmitButton label="Cambiar email" />
        <Saved
          saved={state?.saved}
          message={`Listo. Desde ahora ingresás con ${state?.value}.`}
        />
      </div>
    </form>
  );
}

export function AliasForm({
  accountId,
  currency,
  alias,
}: {
  accountId: string;
  currency: Currency;
  alias: string;
}) {
  const [state, action] = useActionState(updateAlias, undefined);
  const id = `alias-${currency}`;

  return (
    <form action={action} noValidate>
      <input type="hidden" name="accountId" value={accountId} />
      <Field
        id={id}
        name="alias"
        label={`Alias de tu cuenta en ${currency}`}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        defaultValue={state?.value ?? alias}
        error={state?.error}
      />
      <SubmitButton label={`Guardar alias ${currency}`} />
      <Saved saved={state?.saved} message={`Guardamos el alias de tu cuenta en ${currency}.`} />
    </form>
  );
}

export function PreferredCurrencyForm({
  currencies,
  preferred,
}: {
  currencies: Currency[];
  preferred: Currency;
}) {
  const [state, action] = useActionState(updatePreferredCurrency, undefined);
  const selected = state?.value ?? preferred;

  return (
    <form action={action} noValidate>
      <fieldset aria-describedby={state?.error ? "currency-error" : undefined}>
        <legend className="mb-1.5 text-sm text-muted">
          La cuenta que ves primero en Inicio y con la que transferís por email.
        </legend>
        <div className="flex flex-col gap-2">
          {currencies.map((currency) => (
            <label
              key={currency}
              className="flex min-h-11 items-center gap-3 rounded-xl border border-line bg-white px-4 text-sm"
            >
              <input
                type="radio"
                name="currency"
                value={currency}
                defaultChecked={selected === currency}
                className="size-5 accent-garnet"
              />
              {CURRENCY_LABELS[currency]}
            </label>
          ))}
        </div>
      </fieldset>
      {state?.error && (
        <p id="currency-error" role="alert" className={ERROR_CLASS}>
          {state.error}
        </p>
      )}
      <SubmitButton label="Guardar moneda" />
      <Saved saved={state?.saved} message="Guardamos tu moneda preferida." />
    </form>
  );
}
