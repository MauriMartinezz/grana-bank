import Link from "next/link";
import { formatMoney } from "@/lib/format";
import { groupByDay } from "./group-by-day";
import { movementSource } from "./movement-source";
import { MOVEMENT_TYPE_STYLES } from "./movement-type";
import type { MovementListItem } from "./queries";

// Rendered only behind awaited data, so reading the clock here happens at
// request time and never ends up in a static shell.
// The day headings sit one level under the section that holds the list:
// `h3` under Home's "Últimos movimientos", `h2` under the Movimientos title.
export function MovementList({
  movements,
  headingLevel = "h3",
}: {
  movements: MovementListItem[];
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  const groups = groupByDay(movements, new Date());
  return (
    <div className="flex flex-col gap-5">
      {groups.map((group) => (
        <section key={group.day} aria-labelledby={`movimientos-${group.day}`}>
          <Heading
            id={`movimientos-${group.day}`}
            className="mb-2 text-sm font-semibold text-muted"
          >
            {group.label}
          </Heading>
          <ul className="flex flex-col gap-3">
            {group.items.map((movement) => (
              <MovementRow key={movement.id} movement={movement} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function MovementRow({ movement }: { movement: MovementListItem }) {
  const { label, Icon, tileClass, amountClass } = MOVEMENT_TYPE_STYLES[movement.type];
  return (
    <li>
      <Link
        href={`/movimientos/${movement.id}`}
        className="flex items-center gap-4 rounded-2xl bg-surface p-4 transition-colors hover:bg-surface/70 active:bg-surface/60"
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
          <span className="block truncate text-xs text-muted">
            {movementSource(movement)}
          </span>
        </span>
        <span className={`text-sm font-semibold ${amountClass}`}>
          {formatMoney(movement.amountCents, movement.account.currency)}
        </span>
      </Link>
    </li>
  );
}
