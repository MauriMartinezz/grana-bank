"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { HomeIcon, ListIcon } from "@/components/icons";
import { ProfileIcon } from "@/features/profile/profile-icon";

const LINKS = [
  { href: "/home", label: "Inicio", Icon: HomeIcon },
  { href: "/movements", label: "Movimientos", Icon: ListIcon },
  { href: "/profile", label: "Perfil", Icon: ProfileIcon },
];

const ITEM_CLASS =
  "flex min-h-12 min-w-12 items-center justify-center rounded-xl";

function NavBar({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-[430px] items-center justify-around rounded-t-3xl bg-surface px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_16px_rgba(0,0,0,0.05)]"
    >
      {LINKS.map(({ href, label, Icon }) => {
        const isActive = pathname?.startsWith(href) ?? false;
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            className={`${ITEM_CLASS} ${isActive ? "text-garnet" : "text-muted"}`}
          >
            <Icon />
          </Link>
        );
      })}
    </nav>
  );
}

function ActiveNavBar() {
  return <NavBar pathname={usePathname()} />;
}

// On dynamic routes the pathname is only known at request time, so the bar
// is prerendered without an active item and completes while streaming.
export function BottomNav() {
  return (
    <Suspense fallback={<NavBar pathname={null} />}>
      <ActiveNavBar />
    </Suspense>
  );
}
