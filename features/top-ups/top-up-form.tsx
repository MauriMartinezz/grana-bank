"use client";

import {
  startTransition,
  useActionState,
  useState,
  type ComponentProps,
  type FormEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { NOTE_MAX_LENGTH } from "@/features/categories/names";
import type { CardOption } from "@/features/exchange/queries";
import { formatMoney } from "@/lib/format";
import { reviewTopUp } from "./actions";
import {
  formatPhone,
  normalizeDirectvAccount,
  normalizePhone,
  parseTopUpAmount,
  PROVIDER_NAMES,
  PROVIDERS_BY_KIND,
  type TopUpKind,
  type TopUpProvider,
} from "./validation";

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-line bg-surface px-4 text-sm placeholder:font-serif placeholder:text-muted";

function Field({
  id,
  label,
  hint,
  ...input
}: { id: string; label: string; hint: string } & ComponentProps<"input">) {
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="mb-1.5 text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        autoComplete="off"
        aria-describedby={`${id}-hint`}
        className={INPUT_CLASS}
        {...input}
      />
      <p id={`${id}-hint`} className="mt-1.5 text-sm text-muted" aria-live="polite">
        {hint}
      </p>
    </div>
  );
}

/**
 * Amount and paying card, plus the company and the phone number for a phone
 * top-up or the account number for DirecTV. A SUBE top-up gets its card from
 * the screen it opens from. The server checks everything again.
 */
export function TopUpForm({
  kind,
  provider,
  subeCardId,
  cards,
}: {
  kind: TopUpKind;
  /** The company picked on the previous screen; the form asks when absent. */
  provider?: TopUpProvider;
  /** The SUBE card to top up; only for `kind` SUBE. */
  subeCardId?: string;
  cards: CardOption[];
}) {
  const [state, action, pending] = useActionState(reviewTopUp, undefined);
  const [target, setTarget] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const providers = PROVIDERS_BY_KIND[kind];

  const parsed = parseTopUpAmount(amount);
  const phone = kind === "PHONE" ? normalizePhone(target) : null;
  const account = kind === "DIRECTV" ? normalizeDirectvAccount(target) : null;

  // Submitting by hand keeps the typed values: a form `action` would reset
  // them when the server answers with an error.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="kind" value={kind} />

      {provider ? (
        <input type="hidden" name="provider" value={provider} />
      ) : providers.length > 1 ? (
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Compañía</legend>
          <div className="grid grid-cols-2 gap-2">
            {providers.map((provider, index) => (
              <label
                key={provider}
                className="flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-surface font-serif text-sm has-checked:bg-garnet-fill has-checked:text-white has-focus-visible:outline-2"
              >
                <input
                  type="radio"
                  name="provider"
                  value={provider}
                  defaultChecked={index === 0}
                  className="sr-only"
                />
                {PROVIDER_NAMES[provider]}
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <input type="hidden" name="provider" value={providers[0]} />
      )}

      {kind === "SUBE" && <input type="hidden" name="target" value={subeCardId} />}
      {kind === "PHONE" && (
        <Field
          id="target"
          name="target"
          label="Número de teléfono"
          type="tel"
          inputMode="tel"
          placeholder="11 1234 5678"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          hint={phone ? `Vas a recargar ${formatPhone(phone)}` : "Con código de área, por ejemplo 11 1234 5678."}
        />
      )}
      {kind === "DIRECTV" && (
        <Field
          id="target"
          name="target"
          label="Número de cliente"
          inputMode="numeric"
          placeholder="0000 0000"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          hint={account ? `${account.length} dígitos` : "Figura en tu factura: de 8 a 12 números."}
        />
      )}

      <Field
        id="amount"
        name="amount"
        label="Monto a cargar"
        inputMode="decimal"
        placeholder="0,00"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        hint={parsed.ok ? `Vas a cargar ${formatMoney(parsed.cents, "ARS")}` : "De $100 a $50.000."}
      />

      <div className="flex flex-col">
        <label htmlFor="cardId" className="mb-1.5 text-sm font-medium">
          Pagás con
        </label>
        <select id="cardId" name="cardId" defaultValue={cards[0]?.id} className={INPUT_CLASS}>
          {cards.map((card) => (
            <option key={card.id} value={card.id}>
              {card.label} · {card.detail}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label htmlFor="note" className="mb-1.5 text-sm font-medium">
          Nota <span className="font-normal text-muted">(opcional)</span>
        </label>
        <textarea
          id="note"
          name="note"
          rows={2}
          maxLength={NOTE_MAX_LENGTH}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Por ejemplo: carga del mes"
          aria-describedby="note-hint"
          className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm placeholder:font-serif placeholder:text-muted"
        />
        <p id="note-hint" className="mt-1.5 text-xs text-muted">
          Solo la ves vos. {[...note].length}/{NOTE_MAX_LENGTH}
        </p>
      </div>

      {state?.error && (
        <p role="alert" className="text-sm text-garnet">
          {state.error}
        </p>
      )}
      <div className="pt-3">
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Validando…" : "Continuar"}
        </Button>
      </div>
    </form>
  );
}
