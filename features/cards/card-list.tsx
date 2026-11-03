import { ACCOUNT_LABELS } from "./account-label";
import { BrandMark } from "./brand-mark";
import type { AccountCards } from "./queries";
import { BRAND_NAMES } from "./validation";

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
                  <li key={card.id} className="flex items-center gap-3 bg-white p-4">
                    <BrandMark brand={card.brand} />
                    <div className="min-w-0 flex-1">
                      <p
                        className="font-medium tracking-wide"
                        aria-label={`${BRAND_NAMES[card.brand]} terminada en ${card.last4}`}
                      >
                        •••• {card.last4}
                      </p>
                      <p className="truncate text-sm text-muted">{card.holder}</p>
                    </div>
                    <p className="text-right text-xs text-muted">
                      Vence
                      <span className="block text-sm text-ink">{card.expiry}</span>
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl bg-white p-4 text-sm text-muted">
                Todavía no hay tarjetas en esta cuenta.
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
