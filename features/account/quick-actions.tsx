import Link from "next/link";
import { CardIcon, ReceiptIcon, SwapIcon, TopUpIcon } from "@/components/icons";
import { DollarIcon } from "@/features/exchange/icons";

// Four per row; the fifth starts a second row.
const ACTIONS = [
  { href: "/transferir", label: "Transferir", Icon: SwapIcon },
  { href: "/servicios", label: "Servicios", Icon: ReceiptIcon },
  { href: "/recargas", label: "Recargas", Icon: TopUpIcon },
  { href: "/tarjetas", label: "Tarjetas", Icon: CardIcon },
  { href: "/dolares", label: "Dólares", Icon: DollarIcon },
];

export function QuickActions() {
  return (
    <nav aria-label="Accesos rápidos">
      <ul className="grid grid-cols-4 gap-3">
        {ACTIONS.map(({ href, label, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex flex-col items-center gap-2 rounded-2xl bg-surface px-1 py-3 text-xs font-medium"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-garnet-soft text-garnet">
                <Icon />
              </span>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
