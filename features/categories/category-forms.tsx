"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CATEGORY_NAME_MAX_LENGTH } from "./names";
import { addCategory, removeCategory, saveCategoryName, type CategoryFormState } from "./actions";

const INPUT_CLASS =
  "h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 text-sm placeholder:font-serif placeholder:text-muted";
const SMALL_BUTTON =
  "min-h-11 shrink-0 rounded-full px-4 font-serif text-sm disabled:opacity-60";

function SubmitButton({ label, pendingLabel, className }: { label: string; pendingLabel: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${SMALL_BUTTON} ${className}`}>
      {pending ? pendingLabel : label}
    </button>
  );
}

function Feedback({ state, id }: { state: CategoryFormState; id: string }) {
  if (state && "error" in state) {
    return (
      <p id={id} role="alert" className="mt-1.5 text-sm text-garnet">
        {state.error}
      </p>
    );
  }
  if (state && "notice" in state) {
    return (
      <p id={id} role="status" className="mt-1.5 text-sm text-muted">
        {state.notice}
      </p>
    );
  }
  return null;
}

export function AddCategoryForm() {
  const [state, action] = useActionState(addCategory, undefined);
  const failed = Boolean(state && "error" in state);

  return (
    <form action={action}>
      <label htmlFor="newCategory" className="mb-1.5 block text-sm font-medium">
        Nueva categoría
      </label>
      <div className="flex gap-2">
        <input
          id="newCategory"
          name="name"
          maxLength={CATEGORY_NAME_MAX_LENGTH}
          // A new key after a save clears the input; an error keeps the text.
          key={state && "notice" in state ? state.notice : "new"}
          defaultValue={state && "error" in state ? state.value : ""}
          placeholder="Por ejemplo: Viajes"
          aria-invalid={failed}
          aria-describedby="newCategory-feedback"
          className={INPUT_CLASS}
        />
        <SubmitButton label="Agregar" pendingLabel="Agregando…" className="bg-garnet-fill text-white" />
      </div>
      <Feedback state={state} id="newCategory-feedback" />
    </form>
  );
}

/** One category: rename in place, or delete after a confirmation. */
export function CategoryRow({ id, name }: { id: string; name: string }) {
  const [state, action] = useActionState(saveCategoryName, undefined);
  const inputId = `category-${id}`;

  return (
    <li className="bg-surface p-4">
      <form action={action}>
        <input type="hidden" name="categoryId" value={id} />
        <label htmlFor={inputId} className="sr-only">
          Nombre de {name}
        </label>
        <div className="flex gap-2">
          <input
            id={inputId}
            name="name"
            maxLength={CATEGORY_NAME_MAX_LENGTH}
            defaultValue={state && "error" in state ? state.value : name}
            aria-describedby={`${inputId}-feedback`}
            className={INPUT_CLASS}
          />
          <SubmitButton label="Guardar" pendingLabel="Guardando…" className="border border-line" />
        </div>
        <Feedback state={state} id={`${inputId}-feedback`} />
      </form>
      <form
        action={removeCategory}
        onSubmit={(event) => {
          if (!window.confirm(`¿Borrar ${name}? Sus movimientos quedan sin categoría.`)) {
            event.preventDefault();
          }
        }}
        className="mt-2"
      >
        <input type="hidden" name="categoryId" value={id} />
        <button type="submit" className="min-h-11 font-serif text-sm text-garnet">
          Borrar {name}
        </button>
      </form>
    </li>
  );
}
