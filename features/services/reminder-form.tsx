"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { saveReminder } from "./actions";

const OPTIONS = [
  ["", "No avisarme"],
  ["0", "El día del vencimiento"],
  ["1", "1 día antes"],
  ["3", "3 días antes"],
  ["7", "7 días antes"],
] as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Guardando…" : "Guardar"}
    </Button>
  );
}

/** When the bills of this service remind the user in Notificaciones. */
export function ReminderForm({ adhesionId, selected }: { adhesionId: string; selected: number | null }) {
  const [state, action] = useActionState(saveReminder, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="adhesionId" value={adhesionId} />
      <div className="flex flex-col">
        <label htmlFor="reminderDays" className="mb-1.5 text-sm font-medium">
          Recordatorio
        </label>
        <select
          id="reminderDays"
          name="reminderDays"
          defaultValue={selected === null ? "" : String(selected)}
          className="h-11 w-full rounded-xl border border-line bg-surface px-4 text-sm"
        >
          {OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-muted">
          Te avisamos en Notificaciones, la campana del inicio, cuando se acerca el vencimiento.
        </p>
      </div>
      {state && "error" in state && (
        <p role="alert" className="text-sm text-garnet">
          {state.error}
        </p>
      )}
      {state && "notice" in state && (
        <p role="status" className="text-sm text-muted">
          {state.notice}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
