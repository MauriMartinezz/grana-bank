"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { ExchangeDirection } from "@/generated/prisma/client";
import { parseAmountToCents } from "@/features/transfers/amount";
import { formatMoney } from "@/lib/format";
import { reviewExchange } from "./actions";
import type { CardOption } from "./queries";
import { isExchangeAmount, usdToArsCents } from "./rate";

const INPUT_CLASS =
  "h-11 w-full rounded-xl border border-line bg-white px-4 text-sm placeholder:font-serif placeholder:text-muted";

const DIRECTIONS: { value: ExchangeDirection; label: string }[] = [
  { value: "BUY", label: "Comprar" },
  { value: "SELL", label: "Vender" },
];

const COPY: Record<ExchangeDirection, { from: string; to: string; equivalent: string }> = {
  BUY: { from: "Pagás con", to: "Recibís los dólares en", equivalent: "Pagás" },
  SELL: { from: "Vendés desde", to: "Recibís los pesos en", equivalent: "Recibís" },
};

function CardSelect({
  name,
  label,
  cards,
}: {
  name: string;
  label: string;
  cards: CardOption[];
}) {
  return (
    <div className="flex flex-col">
      <label htmlFor={name} className="mb-1.5 text-sm font-medium">
        {label}
      </label>
      <select id={name} name={name} defaultValue={cards[0]?.id} className={INPUT_CLASS}>
        {cards.map((card) => (
          <option key={card.id} value={card.id}>
            {card.label} · {card.detail}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Dollar amount, direction and cards. The peso side is computed as the user
 * types; the server computes it again and is the one that counts.
 */
export function ExchangeForm({
  arsCards,
  usdCards,
}: {
  arsCards: CardOption[];
  usdCards: CardOption[];
}) {
  const [state, action, pending] = useActionState(reviewExchange, undefined);
  const [direction, setDirection] = useState<ExchangeDirection>("BUY");
  const [amount, setAmount] = useState("");

  const usdCents = parseAmountToCents(amount);
  const copy = COPY[direction];
  const [fromCards, toCards] = direction === "BUY" ? [arsCards, usdCards] : [usdCards, arsCards];

  // Submitting by hand keeps the typed values: a form `action` would reset
  // them when the server answers with an error.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">¿Qué querés hacer?</legend>
        <div className="grid grid-cols-2 gap-1 rounded-full bg-white p-1">
          {DIRECTIONS.map((option) => (
            <label
              key={option.value}
              className="flex min-h-11 cursor-pointer items-center justify-center rounded-full font-serif text-sm has-checked:bg-garnet has-checked:text-white has-focus-visible:outline-2"
            >
              <input
                type="radio"
                name="direction"
                value={option.value}
                checked={direction === option.value}
                onChange={() => setDirection(option.value)}
                className="sr-only"
              />
              {option.label} dólares
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col">
        <label htmlFor="amount" className="mb-1.5 text-sm font-medium">
          Monto en USD
        </label>
        <input
          id="amount"
          name="amount"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          aria-describedby="amount-hint"
          className={INPUT_CLASS}
        />
        <p id="amount-hint" className="mt-1.5 text-sm text-muted" aria-live="polite">
          {usdCents !== null && isExchangeAmount(usdCents)
            ? `${copy.equivalent} ${formatMoney(usdToArsCents(usdCents), "ARS")}`
            : "Por ejemplo 100 o 1.500,50"}
        </p>
      </div>

      {/* A new pair of selects per direction, so each starts on its first card. */}
      <div key={direction} className="flex flex-col gap-5">
        <CardSelect name="fromCardId" label={copy.from} cards={fromCards} />
        <CardSelect name="toCardId" label={copy.to} cards={toCards} />
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
