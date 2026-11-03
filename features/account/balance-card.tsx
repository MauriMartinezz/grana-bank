import { MastercardLogo } from "@/components/icons";
import { formatBalance } from "@/lib/format";
import type { AccountWithCards } from "./queries";

const BRAND_LABELS = { MASTERCARD: "Mastercard", VISA: "Visa", AMEX: "American Express" };

export function BalanceCard({
  account,
  holderName,
}: {
  account: AccountWithCards;
  /** Shown on the card face when the account has no card yet. */
  holderName: string;
}) {
  // The first card added is the one on the face of the balance card.
  const card = account.cards[0];

  return (
    <section
      aria-label={`Cuenta en ${account.currency}`}
      className="rounded-[28px] bg-garnet-fill p-6 text-white shadow-lg shadow-black/10"
    >
      <div className="flex items-start justify-between">
        <p className="text-sm">Balance</p>
        {card?.brand === "MASTERCARD" ? (
          <MastercardLogo className="-mt-0.5" />
        ) : (
          card && <p className="text-sm font-semibold">{BRAND_LABELS[card.brand]}</p>
        )}
      </div>
      <p className="mt-1 text-2xl font-medium">
        {formatBalance(account.balanceCents, account.currency)}
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
