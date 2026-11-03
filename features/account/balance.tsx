import { formatMoney } from "@/lib/format";
import { BALANCE_MASK } from "./balance-privacy";

/**
 * A balance that follows the eye on Home: CSS shows the amount or the mask
 * from data-balance on <html>, set before the first paint. Use it wherever a
 * balance shows, so a hidden balance is hidden on every screen.
 */
export function Balance({
  cents,
  currency,
  format = formatMoney,
}: {
  cents: number | bigint;
  currency: string;
  format?: (cents: number | bigint, currency: string) => string;
}) {
  return (
    <>
      <span className="balance-amount">{format(cents, currency)}</span>
      <span className="balance-mask" aria-label="Saldo oculto">
        {BALANCE_MASK}
      </span>
    </>
  );
}
