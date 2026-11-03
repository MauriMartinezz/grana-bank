"use client";

import { useActionState, useState, type InputHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { Currency } from "@/generated/prisma/enums";
import {
  changePassword,
  updateAlias,
  updateEmail,
  updatePreferredCurrency,
  updateProfile,
} from "./actions";
import { CURRENCY_LABELS } from "./currency-labels";

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-line bg-white px-4 text-sm placeholder:font-serif placeholder:text-muted";
const ERROR_CLASS = "mt-1.5 text-sm text-garnet";

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

/** A password input with a show/hide toggle, like the login form. */
function PasswordField({
  id,
  label,
  error,
  autoComplete,
  hint,
  toggleName,
}: {
  id: string;
  label: string;
  /** What the show/hide button names, e.g. "nueva contraseña". */
  toggleName: string;
  error?: string;
  autoComplete: "current-password" | "new-password";
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="mb-1.5 text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy || undefined}
          className={`${INPUT_CLASS} pr-11`}
        />
        <button
          type="button"
          onClick={() => setShow((value) => !value)}
          aria-label={`${show ? "Ocultar" : "Mostrar"} ${toggleName}`}
          aria-pressed={show}
          className="absolute top-0 right-0 flex size-11 items-center justify-center text-muted"
        >
          {show ? <EyeIcon className="size-5" /> : <EyeOffIcon className="size-5" />}
        </button>
      </div>
      {hint && (
        <p id={hintId} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className={ERROR_CLASS}>
          {error}
        </p>
      )}
    </div>
  );
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
      <SubmitButton label="Guardar datos" />
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
        defaultValue={state?.value}
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
      <SubmitButton label="Cambiar email" />
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
      <SubmitButton label="Guardar alias" />
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
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, undefined);
  const errors = state?.errors;

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <PasswordField
        id="current"
        label="Contraseña actual"
        toggleName="contraseña actual"
        autoComplete="current-password"
        error={errors?.current}
      />
      <PasswordField
        id="next"
        label="Nueva contraseña"
        toggleName="nueva contraseña"
        autoComplete="new-password"
        hint="Al menos 8 caracteres."
        error={errors?.next}
      />
      <PasswordField
        id="confirmation"
        label="Repetí la nueva contraseña"
        toggleName="confirmación"
        autoComplete="new-password"
        error={errors?.confirmation}
      />
      <FormError error={errors?.form} />
      <SubmitButton label="Cambiar contraseña" />
    </form>
  );
}
