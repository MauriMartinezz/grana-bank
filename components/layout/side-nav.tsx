"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { NAV_LINKS, isActiveLink } from "@/components/layout/nav-links";

const PROFILE_HREF = "/perfil";

function NavLink({
  link: { href, label, Icon },
  pathname,
}: {
  link: (typeof NAV_LINKS)[number];
  pathname: string | null;
}) {
  const isActive = isActiveLink(pathname, href);
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold ${
        isActive ? "bg-garnet-soft text-garnet" : "text-muted hover:bg-canvas"
      }`}
    >
      <Icon className="size-6 shrink-0" />
      {label}
    </Link>
  );
}

// The full height of the screen, sticky while the page scrolls; Perfil sits
// at the bottom, apart from the other destinations.
function SideBar({ pathname }: { pathname: string | null }) {
  const profile = NAV_LINKS.find((link) => link.href === PROFILE_HREF);
  return (
    <nav
      aria-label="Principal"
      className="sticky top-0 hidden h-dvh flex-col gap-1 self-start border-r border-line bg-surface px-4 py-6 desktop:flex"
    >
      <Link href="/inicio" className="mb-4 flex items-center gap-2 rounded-xl px-3 py-2">
        <Image src="/logo.png" alt="" width={32} height={32} unoptimized />
        <span className="font-serif text-lg font-bold text-garnet">GranaBank</span>
      </Link>
      {NAV_LINKS.filter((link) => link.href !== PROFILE_HREF).map((link) => (
        <NavLink key={link.href} link={link} pathname={pathname} />
      ))}
      {profile && (
        <div className="mt-auto border-t border-line pt-4">
          <NavLink link={profile} pathname={pathname} />
        </div>
      )}
    </nav>
  );
}

function ActiveSideBar() {
  return <SideBar pathname={usePathname()} />;
}

/**
 * The navigation of the desktop view, with the same destinations as the bottom
 * bar. Hidden in the mobile view. Like BottomNav, it completes its active item
 * while streaming on dynamic routes.
 */
export function SideNav() {
  return (
    <Suspense fallback={<SideBar pathname={null} />}>
      <ActiveSideBar />
    </Suspense>
  );
}
