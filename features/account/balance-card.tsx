import { MastercardLogo } from "@/components/icons";
import { formatAmount } from "@/lib/format";
import type { getAccount } from "./queries";

type Account = NonNullable<Awaited<ReturnType<typeof getAccount>>>;

export function BalanceCard({ account }: { account: Account }) {
  return (
    <section
      aria-label="Tarjeta y saldo"
      className="rounded-[28px] bg-garnet p-6 text-white shadow-lg shadow-black/10"
    >
      <div className="flex items-start justify-between">
        <p className="text-sm">Balance</p>
        <MastercardLogo className="-mt-0.5" />
      </div>
      <p className="mt-1 flex items-center gap-2 text-2xl font-medium">
        <span className="rounded-md bg-linear-to-br from-[#e0a92e] via-[#e58fb0] to-[#a98be0] px-2.5 py-1 text-sm text-white">
          {account.currency}
        </span>
        {formatAmount(account.balanceCents)}
      </p>
      <p
        aria-label={`Tarjeta terminada en ${account.cardLast4}`}
        className="mt-5 text-2xl tracking-wide"
      >
        **** **** **** {account.cardLast4}
      </p>
      <div className="mt-4 flex items-end justify-between">
        <p className="font-medium">{account.cardHolder}</p>
        <p className="text-right text-sm leading-tight">
          <span className="block text-[10px]">Exp. Date</span>
          {account.cardExpiry}
        </p>
      </div>
    </section>
  );
}
