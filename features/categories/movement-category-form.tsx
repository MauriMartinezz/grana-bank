"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { changeMovementCategory } from "./actions";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 shrink-0 rounded-full border border-line px-4 font-serif text-sm disabled:opacity-60"
    >
      {pending ? "Guardando…" : "Guardar"}
    </button>
  );
}

/**
 * The movement's category, private to its owner, changed in place. The page
 * labels the select (`movementCategory`) in its own description list.
 */
export function MovementCategoryForm({
  movementId,
  categoryId,
  categories,
}: {
  movementId: string;
  categoryId: string | null;
  categories: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(changeMovementCategory, undefined);

  return (
    <form action={action}>
      <input type="hidden" name="movementId" value={movementId} />
      <div className="flex items-center gap-2">
        <select
          id="movementCategory"
          name="categoryId"
          defaultValue={categoryId ?? ""}
          className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-sm"
        >
          <option value="">Sin categoría</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <SaveButton />
      </div>
      {state && "error" in state && (
        <p role="alert" className="mt-1.5 text-sm text-garnet">
          {state.error}
        </p>
      )}
      {state && "notice" in state && (
        <p role="status" className="mt-1.5 text-sm text-muted">
          {state.notice}
        </p>
      )}
    </form>
  );
}
