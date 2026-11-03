import Link from "next/link";
import { CardIcon, ReceiptIcon, SwapIcon, TopUpIcon } from "@/components/icons";

const ACTIONS = [
  { href: "/transfers", label: "Transferir", Icon: SwapIcon },
  { href: "/services", label: "Servicios", Icon: ReceiptIcon },
  { href: "/top-ups", label: "Recargas", Icon: TopUpIcon },
  { href: "/cards", label: "Tarjetas", Icon: CardIcon },
];

export function QuickActions() {
  return (
    <nav aria-label="Accesos rápidos">
      <ul className="grid grid-cols-4 gap-3">
        {ACTIONS.map(({ href, label, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex flex-col items-center gap-2 rounded-2xl bg-white px-1 py-3 text-xs font-medium"
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
