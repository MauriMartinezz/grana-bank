"use client";

import { useActionState, type InputHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { FieldState } from "./actions";

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-line bg-white px-4 text-sm placeholder:font-serif placeholder:text-muted";

function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? pendingLabel : label}
    </Button>
  );
}

/** One input, one server action, and the error under the input. */
export function FieldForm({
  action: serverAction,
  label,
  name,
  hidden = {},
  submitLabel,
  pendingLabel,
  input,
}: {
  action: (previous: FieldState, formData: FormData) => Promise<FieldState>;
  label: string;
  name: string;
  hidden?: Record<string, string>;
  submitLabel: string;
  pendingLabel: string;
  input: InputHTMLAttributes<HTMLInputElement>;
}) {
  const [state, action] = useActionState(serverAction, undefined);
  const errorId = `${name}-error`;

  return (
    <form action={action} noValidate className="flex flex-col">
      {Object.entries(hidden).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <label htmlFor={name} className="mb-1.5 text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        defaultValue={state?.value}
        aria-invalid={Boolean(state?.error)}
        aria-describedby={state?.error ? errorId : undefined}
        className={INPUT_CLASS}
        {...input}
      />
      {state?.error && (
        <p id={errorId} role="alert" className="mt-1.5 text-sm text-garnet">
          {state.error}
        </p>
      )}
      <div className="pt-8">
        <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
      </div>
    </form>
  );
}
