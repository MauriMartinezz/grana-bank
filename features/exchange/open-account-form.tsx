"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { openDollarAccount } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Abriendo…" : "Abrir cuenta en dólares"}
    </Button>
  );
}

export function OpenAccountForm() {
  const [state, action] = useActionState(openDollarAccount, undefined);

  return (
    <form action={action} className="w-full pt-4">
      {state?.error && (
        <p role="alert" className="mb-3 text-sm text-garnet">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
