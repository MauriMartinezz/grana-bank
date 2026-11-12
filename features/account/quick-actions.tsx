import Link from "next/link";
import { CardIcon, ChartIcon, PlusIcon, ReceiptIcon, SwapIcon, TagIcon, TopUpIcon } from "@/components/icons";
import { DollarIcon } from "@/features/exchange/icons";

// Four per row; the rest start a second row. Labels are one word, so each
// stays on one centered line.
// Ingresar dinero first: it funds every other operation in the demo.
export const QUICK_ACTIONS = [
  { href: "/ingresar-dinero", label: "Ingresar", Icon: PlusIcon },
  { href: "/transferir", label: "Transferir", Icon: SwapIcon },
  { href: "/servicios", label: "Servicios", Icon: ReceiptIcon },
  { href: "/recargas", label: "Recargas", Icon: TopUpIcon },
  { href: "/tarjetas", label: "Tarjetas", Icon: CardIcon },
  { href: "/dolares", label: "Dólares", Icon: DollarIcon },
  { href: "/promociones", label: "Promos", Icon: TagIcon },
  { href: "/finanzas", label: "Finanzas", Icon: ChartIcon },
];

export function QuickActions() {
  return (
    <nav aria-label="Accesos rápidos">
      <ul className="grid grid-cols-4 gap-3">
        {QUICK_ACTIONS.map(({ href, label, Icon }) => (
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
