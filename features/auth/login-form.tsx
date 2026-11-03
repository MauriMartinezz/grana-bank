"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { login } from "./actions";

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-line bg-white px-4 text-sm placeholder:font-serif placeholder:text-muted";

const ERROR_CLASS = "mt-1.5 text-sm text-garnet";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Ingresando…" : "Ingresar"}
    </Button>
  );
}

export function LoginForm() {
  const [state, action] = useActionState(login, undefined);
  const [showPassword, setShowPassword] = useState(false);
  const errors = state?.errors;

  return (
    <form action={action} noValidate className="flex flex-1 flex-col">
      <label htmlFor="email" className="mb-1.5 text-sm font-medium">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="tu@email.com"
        defaultValue={state?.email}
        aria-invalid={Boolean(errors?.email)}
        aria-describedby={errors?.email ? "email-error" : undefined}
        className={INPUT_CLASS}
      />
      {errors?.email && (
        <p id="email-error" role="alert" className={ERROR_CLASS}>
          {errors.email}
        </p>
      )}

      <label htmlFor="password" className="mt-4 mb-1.5 text-sm font-medium">
        Contraseña
      </label>
      <div className="relative">
        <input
          id="password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="Tu contraseña"
          aria-invalid={Boolean(errors?.password)}
          aria-describedby={errors?.password ? "password-error" : undefined}
          className={`${INPUT_CLASS} pr-11`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((show) => !show)}
          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={showPassword}
          className="absolute top-0 right-0 flex size-11 items-center justify-center text-muted"
        >
          {showPassword ? (
            <EyeIcon className="size-5" />
          ) : (
            <EyeOffIcon className="size-5" />
          )}
        </button>
      </div>
      {errors?.password && (
        <p id="password-error" role="alert" className={ERROR_CLASS}>
          {errors.password}
        </p>
      )}

      <label className="mt-3 flex min-h-11 items-center gap-2 font-serif text-sm">
        <input
          type="checkbox"
          name="remember"
          defaultChecked={state?.remember}
          className="size-5 rounded accent-garnet"
        />
        Recordarme
      </label>

      {errors?.form && (
        <p role="alert" className={ERROR_CLASS}>
          {errors.form}
        </p>
      )}

      <div className="mt-auto pt-8">
        <SubmitButton />
      </div>
    </form>
  );
}
