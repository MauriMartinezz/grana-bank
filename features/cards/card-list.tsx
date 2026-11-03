import Link from "next/link";
import { ACCOUNT_LABELS } from "./account-label";
import { BrandMark } from "./brand-mark";
import type { AccountCards } from "./queries";
import { BRAND_NAMES } from "./validation";
import { defaultCardId } from "./default-card";

/** The user's cards, one section per account. */
export function CardList({ accounts }: { accounts: AccountCards[] }) {
  return (
    <div className="space-y-6">
      {accounts.map((account) => {
        const headingId = `account-${account.id}`;
        return (
          <section key={account.id} aria-labelledby={headingId}>
            <h2 id={headingId} className="mb-2 flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium">
                {ACCOUNT_LABELS[account.currency]} ({account.currency})
              </span>
              <span className="truncate text-xs text-muted">{account.alias}</span>
            </h2>
            {account.cards.length > 0 ? (
              <ul className="space-y-px overflow-hidden rounded-2xl">
                {account.cards.map((card) => (
                  <li key={card.id}>
                    <Link
                      href={`/tarjetas/${card.id}`}
                      aria-label={`Ver tarjeta ${BRAND_NAMES[card.brand]} terminada en ${card.last4}`}
                      className="flex items-center gap-3 bg-surface p-4 transition-colors hover:bg-surface/70 active:bg-surface/60"
                    >
                      <BrandMark brand={card.brand} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium tracking-wide">
                          •••• {card.last4}
                          {card.id === defaultCardId(account.cards, account.defaultCardId) && (
                            <span className="ml-2 rounded-full bg-garnet-soft px-2 py-0.5 align-middle text-[11px] font-semibold tracking-normal text-garnet">
                              Predeterminada
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-sm text-muted">{card.holder}</span>
                      </span>
                      <span className="text-right text-xs text-muted">
                        Vence
                        <span className="block text-sm text-ink">{card.expiry}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl bg-surface p-4 text-sm text-muted">
                Todavía no hay tarjetas en esta cuenta.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
