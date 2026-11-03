"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { NAV_LINKS, isActiveLink } from "@/components/layout/nav-links";

function SideBar({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="Principal"
      className="sticky top-6 hidden max-h-[calc(100dvh-3rem)] flex-col gap-1 self-start rounded-3xl bg-surface p-4 shadow-[0_4px_16px_rgba(0,0,0,0.05)] desktop:flex"
    >
      <Link href="/inicio" className="mb-4 flex items-center gap-2 rounded-xl px-3 py-2">
        <Image src="/logo.png" alt="" width={32} height={32} unoptimized />
        <span className="font-serif text-lg font-bold text-garnet">GranaBank</span>
      </Link>
      {NAV_LINKS.map(({ href, label, Icon }) => {
        const isActive = isActiveLink(pathname, href);
        return (
          <Link
            key={href}
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
      })}
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
