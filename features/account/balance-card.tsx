import Link from "next/link";
import { MastercardLogo } from "@/components/icons";
import { formatBalance } from "@/lib/format";
import { Balance } from "./balance";
import { BalanceVisibilityToggle } from "./balance-visibility-toggle";
import type { AccountWithCards } from "./queries";

const BRAND_LABELS = { MASTERCARD: "Mastercard", VISA: "Visa", AMEX: "American Express" };

type Card = AccountWithCards["cards"][number];

/** One card face: the account's balance and alias, and the card's details. */
function CardFace({
  account,
  card,
  holderName,
  label,
}: {
  account: AccountWithCards;
  card: Card | undefined;
  holderName: string;
  label: string;
}) {
  return (
    <section
      aria-label={label}
      className="relative rounded-[28px] bg-garnet-fill p-6 text-white shadow-lg shadow-black/10"
    >
      {card && (
        // Covers the whole card, so a tap anywhere opens the card's page; the
        // eye sits above it, since a button cannot live inside a link.
        <Link
          href={`/tarjetas/${card.id}`}
          aria-label={`Ver la tarjeta ${BRAND_LABELS[card.brand]} terminada en ${card.last4}`}
          className="absolute inset-0 rounded-[28px] focus-visible:outline-2 focus-visible:outline-offset-2"
        />
      )}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm">Balance</p>
          <div className="relative z-10">
            <BalanceVisibilityToggle />
          </div>
        </div>
        {card?.brand === "MASTERCARD" ? (
          <MastercardLogo className="-mt-0.5" />
        ) : (
          card && <p className="text-sm font-semibold">{BRAND_LABELS[card.brand]}</p>
        )}
      </div>
      <p className="mt-1 text-2xl font-medium">
        {/* CSS shows one of the two, following data-balance on <html>. */}
        <Balance cents={account.balanceCents} currency={account.currency} format={formatBalance} />
      </p>
      <p className="mt-1 truncate text-xs text-white/80">Alias: {account.alias}</p>
      {card ? (
        <>
          <p
            aria-label={`Tarjeta terminada en ${card.last4}`}
            className="mt-4 text-2xl tracking-wide"
          >
            **** **** **** {card.last4}
          </p>
          <div className="mt-4 flex items-end justify-between">
            <p className="font-medium">{card.holder}</p>
            <p className="text-right text-sm leading-tight">
              <span className="block text-[10px]">Exp. Date</span>
              {card.expiry}
            </p>
          </div>
        </>
      ) : (
        <div className="mt-4">
          <p className="mt-4 font-medium">{holderName}</p>
        </div>
      )}
    </section>
  );
}

/** A card in the carousel: brand, number, holder and expiry, linking to its page. */
function MiniCard({ card, isDefault, label }: { card: Card; isDefault: boolean; label: string }) {
  return (
    <Link
      href={`/tarjetas/${card.id}`}
      aria-label={`${label}: ${BRAND_LABELS[card.brand]} terminada en ${card.last4}${isDefault ? ", predeterminada" : ""}`}
      className="block rounded-2xl bg-garnet-fill/90 p-4 text-white shadow-md shadow-black/10"
    >
      <span className="flex items-center justify-between">
        <span className="text-sm font-semibold">{BRAND_LABELS[card.brand]}</span>
        {isDefault && (
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">
            Predeterminada
          </span>
        )}
      </span>
      <span className="mt-3 block text-lg tracking-wide">**** **** **** {card.last4}</span>
      <span className="mt-2 flex items-end justify-between text-sm">
        <span className="truncate font-medium">{card.holder}</span>
        <span className="shrink-0 text-right leading-tight">
          <span className="block text-[10px]">Exp. Date</span>
          {card.expiry}
        </span>
      </span>
    </Link>
  );
}

/**
 * The selected account's balance. With one card (or none) it is the card face
 * of the design. With several, the balance shows once, since the cards share
 * it, and the cards follow in a carousel, the default first.
 */
export function BalanceCard({
  account,
  holderName,
}: {
  account: AccountWithCards;
  /** Shown on the card face when the account has no card yet. */
  holderName: string;
}) {
  const label = `Cuenta en ${account.currency}`;
  if (account.cards.length <= 1) {
    return <CardFace account={account} card={account.cards[0]} holderName={holderName} label={label} />;
  }

  const total = account.cards.length;
  return (
    <div>
      <section
        aria-label={label}
        className="rounded-[28px] bg-garnet-fill p-6 text-white shadow-lg shadow-black/10"
      >
        <div className="flex items-center gap-2">
          <p className="text-sm">Balance</p>
          <BalanceVisibilityToggle />
        </div>
        <p className="mt-1 text-2xl font-medium">
          <Balance cents={account.balanceCents} currency={account.currency} format={formatBalance} />
        </p>
        <p className="mt-1 truncate text-xs text-white/80">Alias: {account.alias}</p>
        <p className="mt-3 text-xs text-white/80">
          {total} tarjetas usan este saldo
        </p>
      </section>

      <div role="region" aria-label={`Tarjetas de la cuenta en ${account.currency}`} className="mt-3">
        {/* CSS scroll snapping: no script, and the next card peeks in. The
            account's cards come with the default one first. */}
        <ul className="-mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-1 [scrollbar-width:none] desktop:mx-0 desktop:px-0">
          {account.cards.map((card, index) => (
            <li key={card.id} className="w-[78%] shrink-0 snap-start">
              <MiniCard card={card} isDefault={index === 0} label={`Tarjeta ${index + 1} de ${total}`} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
