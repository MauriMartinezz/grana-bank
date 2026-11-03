import type { ReactNode } from "react";
import { formatDate } from "@/lib/format";
import { ACCOUNT_LABELS } from "./account-label";
import { BrandMark } from "./brand-mark";
import type { OwnCard } from "./queries";
import { BRAND_NAMES, expiryStatus, type ExpiryStatus } from "./validation";

const EXPIRY_NOTES: Record<ExpiryStatus, { text: string; className: string } | null> = {
  expired: { text: "Vencida", className: "bg-garnet-soft text-garnet" },
  expiring: { text: "Vence pronto", className: "bg-yellow-soft text-ink" },
  valid: null,
};

/** The card face and its details: brand, last digits, holder, expiry and account. */
export function CardDetails({ card, now = new Date() }: { card: OwnCard; now?: Date }) {
  const status = expiryStatus(card.expiry, now);
  const note = status && EXPIRY_NOTES[status];
  const brand = BRAND_NAMES[card.brand];

  return (
    <>
      <section
        aria-label={`Tarjeta ${brand} terminada en ${card.last4}`}
        className="rounded-[28px] bg-garnet-fill p-6 text-white shadow-lg shadow-black/10"
      >
        <BrandMark brand={card.brand} />
        <p aria-hidden="true" className="mt-8 text-2xl tracking-wide">
          ···· {card.last4}
        </p>
        <div aria-hidden="true" className="mt-4 flex items-end justify-between gap-4">
          <p className="truncate font-medium">{card.holder}</p>
          <p className="text-right text-sm leading-tight">
            <span className="block text-[10px]">Vence</span>
            {card.expiry}
          </p>
        </div>
      </section>

      <dl className="mt-5 divide-y divide-line rounded-2xl bg-surface px-5 text-sm">
        <Detail term="Marca">{brand}</Detail>
        <Detail term="Terminación">{card.last4}</Detail>
        <Detail term="Titular">{card.holder}</Detail>
        <Detail term="Vence">
          <span className="inline-flex items-center gap-2">
            {card.expiry}
            {note && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${note.className}`}>
                {note.text}
              </span>
            )}
          </span>
        </Detail>
        <Detail term="Cuenta">
          {ACCOUNT_LABELS[card.account.currency]} · {card.account.alias}
        </Detail>
        <Detail term="Agregada">{formatDate(card.createdAt)}</Detail>
      </dl>
    </>
  );
}

function Detail({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-6 py-3">
      <dt className="text-muted">{term}</dt>
      <dd className="min-w-0 text-right font-medium break-words">{children}</dd>
    </div>
  );
}
