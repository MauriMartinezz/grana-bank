import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { MOVEMENT_TYPE_STYLES } from "./movement-type";
import type { MovementListItem } from "./queries";

export function MovementList({ movements }: { movements: MovementListItem[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {movements.map((movement) => {
        const { label, Icon, tileClass, amountClass } =
          MOVEMENT_TYPE_STYLES[movement.type];
        return (
          <li key={movement.id}>
            <Link
              href={`/movements/${movement.id}`}
              className="flex items-center gap-4 rounded-2xl bg-white p-4 transition-colors hover:bg-white/70 active:bg-white/60"
            >
              <span
                className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${tileClass}`}
              >
                <Icon />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {movement.counterparty}
                </span>
                <span className="block text-xs text-muted">{label}</span>
              </span>
              <span className={`text-sm font-semibold ${amountClass}`}>
                {formatMoney(movement.amountCents, movement.account.currency)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
