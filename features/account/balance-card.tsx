import { MastercardLogo } from "@/components/icons";
import { formatAmount } from "@/lib/format";
import type { AccountWithCards } from "./queries";

const BRAND_LABELS = { MASTERCARD: "Mastercard", VISA: "Visa", AMEX: "American Express" };

export function BalanceCard({ account }: { account: AccountWithCards }) {
  // The first card added is the one on the face of the balance card.
  const card = account.cards[0];

  return (
    <section
      aria-label="Tarjeta y saldo"
      className="rounded-[28px] bg-garnet p-6 text-white shadow-lg shadow-black/10"
    >
      <div className="flex items-start justify-between">
        <p className="text-sm">Balance</p>
        {card?.brand === "MASTERCARD" ? (
          <MastercardLogo className="-mt-0.5" />
        ) : (
          card && <p className="text-sm font-semibold">{BRAND_LABELS[card.brand]}</p>
        )}
      </div>
      <p className="mt-1 flex items-center gap-2 text-2xl font-medium">
        <span className="rounded-md bg-linear-to-br from-[#e0a92e] via-[#e58fb0] to-[#a98be0] px-2.5 py-1 text-sm text-white">
          {account.currency}
        </span>
        {formatAmount(account.balanceCents)}
      </p>
      {card && (
        <>
          <p
            aria-label={`Tarjeta terminada en ${card.last4}`}
            className="mt-5 text-2xl tracking-wide"
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
      )}
    </section>
  );
}
