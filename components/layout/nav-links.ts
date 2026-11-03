import { CardIcon, HomeIcon, ListIcon, ReceiptIcon } from "@/components/icons";
import { ProfileIcon } from "@/features/profile/profile-icon";

/** The main destinations, shared by the bottom bar (mobile) and the sidebar (desktop). */
export const NAV_LINKS = [
  { href: "/inicio", label: "Inicio", Icon: HomeIcon },
  { href: "/movimientos", label: "Movimientos", Icon: ListIcon },
  { href: "/tarjetas", label: "Tarjetas", Icon: CardIcon },
  { href: "/servicios", label: "Servicios", Icon: ReceiptIcon },
  { href: "/perfil", label: "Perfil", Icon: ProfileIcon },
];

export function isActiveLink(pathname: string | null, href: string): boolean {
  return pathname?.startsWith(href) ?? false;
}
